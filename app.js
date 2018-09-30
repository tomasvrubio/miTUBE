var express = require('express'),
    favicon = require('express-favicon'),
    nodemailer = require('nodemailer'),
    flash = require('connect-flash'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    LocalStrategy = require('passport-local'),
    passportLocalMongoose = require('passport-local-mongoose'), //Revisar que es lo que utilizo realmente de passport
    moment = require('moment'),
    morgan = require('morgan'),
    credentials = require('./credentials.js'), 
    List = require('./models/list.js'),
    ListUser = require('./models/listUser.js'),
    User = require('./models/user.js');
    //Utilizamos un fichero con las credenciales. Importante que no sincronice con el repositorio.

var Synchronize = require('./lib/synchronize.js')(),
    Gmusic = require('./lib/gmusic.js')(),
    logger = require('./lib/logger');

var handlebars = require('express-handlebars').create({
    defaultLayout:'main',    
    helpers: {
      static: function(name) {
          return require('./lib/static.js').map(name);
      }
  }
});

var app = express();
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('port', process.env.PORT || 3000);

//Morgan logger
app.use(morgan('dev', {
  skip: function (req, res) {
      return res.statusCode < 400
  }, stream: process.stderr
}));

app.use(morgan('dev', {
  skip: function (req, res) {
      return res.statusCode >= 400
  }, stream: process.stdout
}));

//Email sender
var mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: credentials.gmail.user,
    pass: credentials.gmail.password,
  }
});

//Database 
mongoose.connect(credentials.mongo.connectionString);


app.use(favicon(__dirname + '/public/favicon.png'));
app.use(express.static(__dirname + '/public'));
app.use(require('body-parser').urlencoded({extended:true})); //Para poder usar variables de formulario en req.body
app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
  secret: 'Hello World, this is a session',
  resave: false,    
  saveUninitialized: false
}));

//Passport
app.use(passport.initialize());
app.use(passport.session());

//--------------Local Login
passport.use('local-login', new LocalStrategy({
    // by default, local strategy uses username and password, we will override with email
    usernameField : 'email',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
  },
  function(req, email, password, done) {
    if (email)
      email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

    // asynchronous
    process.nextTick(function() {
      User.findOne({ 'email' : email }, function(err, user) {
        // if there are any errors, return the error
        if (err)
            return done(err);

        // if no user is found, return the message
        if (!user)
            return done(null, false);

        if (!user.validPassword(password))
            return done(null, false);

        // all is well, return user
        else{
          req.session.email = req.body.email; 
          return done(null, user);
        }
      });
    });
  }
));


// used to serialize the user for the session
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});



//Flash messages - (CAP9 - Using Sessions to Implement Flash Messages)
// app.use(function(req, res, next){
//   res.locals.flash = req.session.flash;
//   delete req.session.flash;
//   next();
// });
app.use(flash());

app.use(function(req, res, next){
  res.locals.success_message = req.flash('success_message');
  res.locals.error_message = req.flash('error_message');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
 });


//Pintamos las peticiones mientras seguimos desarrollando para saber el flujo de la aplicación
//TODO: A eliminar
app.use(function(req, res, next){
  // console.log(req.session);
  logger.debug(JSON.stringify(req.session));
  next();
});



//--------------Middleware propio
//route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated())
      return next();
  res.status(404);
  res.render('404');
}



//--------------Routing


app.get('/', function(req, res){
  //En caso de estar autenticado la home será la página de listas del usuario
  if (req.isAuthenticated())
    return res.redirect(303, '/user');

  var context = {
    logged: req.isAuthenticated(),
    name: req.session.username || "Anonymous",
    csrf: 'CSRF token goes here'
  };
  res.render('home', context);
});

//TODO: Ver como hacer para obligar a que haga lo de gmusic en vez de ponerse a hacer otras cosas (si pincha links de la cabecera).
app.post('/process-home', passport.authenticate("local-login",{
    // successRedirect: "/gmusic", //TODO: Bueno pero lento al tener que llamar a gmusic. Activarlo. 
    successRedirect: "/user", //Lo dejo mientras sigo haciendo pruebas para que vaya más rápido. Eliminarlo.
    failureRedirect: "/",
    failureFlash: 'Invalid username or password.' //Me falla porque dice que no encuentra req.flash
  }), function(req, res){
    //Por esta función pasa en caso de que haya hecho un successRedirect y no haya indicado arriba la dirección. Para algún caso me puede interesar y hacer algo más con la petición recibida.  
    //console.log(req.session);
    //res.redirect(303, "/user");
});

app.get('/logout', isLoggedIn, function(req, res){
  req.logout();
  res.redirect(303,"/");
});

app.get('/register', function(req, res){
  res.render('register', { csrf: 'CSRF token goes here' });
});

app.post('/register', function(req, res){
  var cart = {
    name: req.body.name,
    email: req.body.email.toLowerCase(),
    pass: Math.random().toString().replace(/^0\.0*/, ''),
  };
  logger.debug(JSON.stringify(cart)); //TODO: A eliminar

  Promise.all([
    User.findOne({'email' : cart.email}),
    User.aggregate([{$group : {_id : null, macMax : {$max : "$mac"}}}])
  ]).then( ([user, macData]) => {
    var macMax = macData[0].macMax;
    logger.debug("Actual max MAC is: "+macMax);

    if (macMax){
      var newMacArray = macMax.split(":");
      var incrementalNumber = parseInt(newMacArray[5],16);
      if (incrementalNumber<255){
        newMacArray[5] = (incrementalNumber+1).toString(16);
      }
      else{
        incrementalNumber = parseInt(newMacArray[4],16);
        newMacArray[4] = (incrementalNumber+1).toString(16);
        newMacArray[5] = "00";
      }
        
    } else {
      var newMacArray = [
        "b8", "27", "eb", 
        Math.floor(Math.random()*255).toString(16), Math.floor(Math.random()*240).toString(16),
        "00"
      ];
    }

    var newMac = newMacArray.join(":");
    logger.debug("New MAC is: "+newMac)

    if (user){
      logger.debug("Allready registered user");
      res.render('register', {message: "Usuario ya registrado previamente"});
    } else {
      var newUser = new User({
        username: cart.name,
        email: cart.email,
        mac: newMac,
        created: Date.now(),
        role: "deactivated"
      });
      newUser.password =  newUser.generateHash(cart.pass);
      newUser.save(function(err) {
        if (err){
          logger.error("Can't save user in DB");
          logger.error(err);
          res.render("register", {message: "Ha ocurrido un error técnico"});
        }
            
        res.render("email/email_lite", { layout: null, cart: cart }, function(err,html){
          if(err) logger.error("Problems using email template");
          mailTransport.sendMail({
            from: '"miTUBE": desarrollovazquezrubio@gmail.com',
            to: cart.email,
            subject: "Here is your login information",
            html: html,
            generateTextFromHtml: true
          }, function(err){
            if(err) logger.error("Unable to send email: %o",err.stack);  
          });
        });
        logger.debug("User saved to DB");
        res.render('register', {message: "Usuario dado de alta. Debe esperar a que el administrador autorice su acceso."});
      });
    }
  }).catch(err => {
    logger.error("Problems searching if exists User or what is the max MAC: "+JSON.stringify(err.stack));
    //TODO: Y a donde voy?
  });
});

app.get('/about', function(req, res){
  var context = {
    logged: req.isAuthenticated()
  };

  res.render('about', context);
});

app.get('/user', isLoggedIn, function(req, res){
  ListUser.find({email:req.session.email}, function(err, lists){ 
    var context = {
      logged: req.isAuthenticated(),
      lists: lists.map(function(list){
      return {
          listId: list.listId,
          name: list.name,
          created: moment(list.created).format('DD / MM / YYYY')
        }
      })
    };
    
    res.render('user', context);
  });
});

app.post('/process-user', function(req, res){

  if (req.body.url.includes("http"))
    var listId = req.body.url.split("list=")[1];
  else
    var listId = req.body.url;

  Promise.all([
    ListUser.find({email:req.session.email, listId: listId}).countDocuments(),
    ListUser.find({email:req.session.email, name: req.body.name}).countDocuments()
  ]).then( ([ usedId, usedName ]) => {

    if (usedId){
      logger.debug("URL ya utilizada en otra lista del usuario.");
      return res.redirect(303, '/user');
    }

    if (usedName){
      logger.debug("Nombre ya utilizado en otra lista del usuario.");
      return res.redirect(303, '/user');
    }

    Synchronize.createRelation(credentials.youtube.apiKey, listId, req.body.name, req.session.email)
    .then(nameYT => {
      Synchronize.createList(credentials.youtube.apiKey, listId, nameYT).then(returnObject => {
        Synchronize.generateWorkUpload(listId).then(returnObject => {
          logger.debug("Canciones metidas en workTodo.");
        }).catch(console.error);
        return res.redirect(303, '/user');
      }).catch(console.error);
    }).catch(err => {
      console.error(err.stack);
      logger.debug("Url no válida como lista de Youtube");
      return res.redirect(303, '/user');
    }); 
  });
});

app.get('/list', isLoggedIn, function(req, res){
  Synchronize.checkUpdatedList(credentials.youtube.apiKey, req.query.listid).then(returnObject => {
    logger.debug("Comprobada lista "+req.query.listid);

    Promise.all([
      ListUser.findOne({email:req.session.email, listId: req.query.listid}),
      List.findOne({listId:req.query.listid})
    ]).then( ([listUser, list]) => {
      if (listUser == null || list == null){
        logger.debug("Lista sin detalles almacenados.");
        return res.redirect(303, '/user');
      }
  
      var context = {
        logged: req.isAuthenticated(),
        listId: req.query.listid,
        name: listUser.name,
        updated: listUser.updated,
        nameYT: list.nameYT,
        songs: list.songs.map(function(song){
          return {
              songId: song.songId,
              originalName: song.originalName,
              name: song.name,
              artist: song.artist,
              added: moment(song.added).format('DD / MM / YYYY')
            }
        })
      };

      res.render('list', context);
    });
  }).catch(error => {
    logger.error("Can't check if list is updated - "+error);
    res.render('list', context);
  });
});

app.all('/gmusic', isLoggedIn, function(req, res){
  var authCode = req.body.authCode || null;
  logger.debug("El codigo es: "+authCode);
  
  User.findOne({email:req.session.email}).then(user => {
    Gmusic.getAuth(req.session.email, user.mac, authCode).then(response => {
      logger.debug("He terminado getAuth - Valor respuesta: "+JSON.stringify(response));
  
      var context = {
        logged: req.isAuthenticated(),
        message: response.message,
        urlAuth: response.url,
      };
  
      //Ahora en función de lo que me devuelva me dirigiré a un sitio u otro.
      //TODO: Codigos 1, 2 y 3 pueden ir agrupados? En ese caso será un if 0 y luego else.
      if (response.code == 1) {
        logger.debug(req.session.email+": Usuario sin autorización.");
        res.render('gmusic', context);
      } 
      else if (response.code == 2 || response.code == 3) { //No estoy seguro de que este caso vaya a funcionar bien porque me falta la URL de autenticación. Como he montado la función no la devuelve, ¿no?
        logger.debug(req.session.email+": Clave autorización introducida inválida o usuario no dado de alta en googleMusic.");     
        res.render('gmusic', context);
      } 
      else if (response.code == 0) {
        logger.debug(req.session.email+": Usuario autorizado.");
        res.redirect(303, '/user'); 
      }
    }).catch(err => {
      logger.error("Gmusic coudn't be reached.");
      res.redirect(303, '/logout');
    });
  });
});

// custom 404 page
app.use(function(req, res){
        res.status(404);
        res.render('404');
});

// custom 500 page
app.use(function(err, req, res, next){
        console.error(err.stack);
        res.status(500);
        res.render('500');
});


app.listen(app.get('port'), function(){
  logger.info( 'Express started on http://localhost:' + app.get('port') + ' press Ctrl-C to terminate.' );
});