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
    spawn = require("child_process").spawn,
    List = require('./models/list.js'),
    ListUser = require('./models/listUser.js'),
    WorkTodo = require('./models/workTodo.js'),
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
mongoose.connect(credentials.mongo.connectionString, {useNewUrlParser: true});


app.use(favicon(__dirname + '/public/favicon.png'));
app.use(express.static(__dirname + '/public', {dotfiles: 'allow'}));
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
      User.findOne({email: email}, function(err, user) {
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
          req.session.userdata.email = req.body.email;
          req.session.userdata.role = user.role;
          req.session.userdata.admin = (user.role == "admin");
          req.session.userdata.username = user.username;
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

// app.use(function(req, res, next){
//   res.locals.success_message = req.flash("success_message");
//   res.locals.error_message = req.flash("error_message");
//   res.locals.error = req.flash("error");
//   res.locals.user = req.user || null;
//   next();
//  });


//Pintamos las peticiones mientras seguimos desarrollando para saber el flujo de la aplicación
//TODO: A eliminar
app.use(function(req, res, next){
  logger.debug("Session data: "+JSON.stringify(req.session));
  console.log(req.body);

  return next();
});

//Add userData to context
app.use(function(req, res, next){
  if (req.session.userdata == null) {
    res.locals.userdata = {
      logged: req.isAuthenticated(),
      admin: false,
      gmusicAuth: false,
      home: "/",
      username: "Anonymous",
    };
  } else {
    //TODO: ¿Lo pongo en un middleware en el que hago sólo este tipo de redirecciones? Código más limpio.
    //Para los usuarios creados pero que aún no tienen permiso en la aplicación
    if ( req.session.userdata.role == "disabled" && ["/process-home", "/about", "/manual", "/logout", "/wait"].indexOf(req.url) == -1 )
      return res.redirect(303, "/wait");

    res.locals.userdata = req.session.userdata;
    res.locals.userdata.logged = req.isAuthenticated();
    if (res.locals.userdata.logged == false) res.locals.userdata.home = "/";
  }

 	return next();
});



//--------------Middleware propio
//Ensure user is loggIn
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated())
      return next();
  res.status(403);
  res.render('403');
}

//Ensure user is admin
function adminOnly(req, res, next){
  if(req.isAuthenticated() && req.session.userdata.role==="admin") 
    return next();
	res.status(404);
  res.render('404');
}


//--------------Routing


app.get('/', function(req, res){
  //If authenticated - Userpage is home
  if (req.isAuthenticated())
    return res.redirect(303, '/user');

  req.session.userdata = {};

  var context = {
    userdata: res.locals.userdata,
    csrf: 'CSRF token goes here',
    alert: req.flash("error") || null,
    active: {"home": true},
  };

  logger.debug(req.flash("error"));
  logger.debug("Context: "+JSON.stringify(context));

  res.render('home', context);
});

//TODO: Ver como hacer para obligar a que haga lo de gmusic en vez de ponerse a hacer otras cosas (si pincha links de la cabecera).
app.post('/process-home', passport.authenticate("local-login",{
    //successRedirect: " ", //Sin este parámetro se va a la función de abajo
    failureRedirect: "/",
    failureFlash: "Usuario o contraseña inválidos"
  }), function(req, res){

    if (req.session.userdata.role == "disabled"){
      req.session.userdata.home = "wait";
      res.redirect(303, '/wait');
    } else { //En caso de que si que tenga rol lo que hay que hacer es mandarle a /gmusic
      req.session.userdata.home = "gmusic"
      res.redirect(303, '/gmusic');
    }    
});


app.get('/logout', isLoggedIn, function(req, res){
  req.logout();
  req.session.userdata = {};
  res.redirect(303, '/');
});

app.get('/register', function(req, res){
  var context = {
    userdata: res.locals.userdata,
    csrf: 'CSRF token goes here',
    alert: req.flash("info") || null,
    active: {"register": true},
  };

  res.render('register', context);
});


app.post('/register', function(req, res){
  var cart = {
    name: req.body.name,
    email: req.body.email.toLowerCase(),
  };

  Promise.all([
    User.findOne({email: cart.email}),
    User.aggregate([{$group: {_id: null, macMax: {$max: "$mac"}}}])
  ]).then( ([user, macData]) => {

    if (user){
      logger.debug("Allready registered user");
      req.flash("info", "Usuario ya registrado previamente. Utilice otro email");
      res.redirect(303, "/register");

    } else {
      //Generate password
      cart.pass = Math.random().toString().replace(/^0\.0*/, '');
      logger.debug(JSON.stringify(cart));
      //Generate MAC
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
        //First user is Admin and gets a random MAC
        var newRole = "admin";
        var newMacArray = [
          "b8", "27", "eb", 
          Math.floor(Math.random()*255).toString(16), 
          Math.floor(Math.random()*240).toString(16),
          "00"
        ];
      }

      var newMac = newMacArray.join(":");
      logger.debug("New MAC is: "+newMac);

      var newUser = new User({
        username: cart.name,
        email: cart.email,
        mac: newMac,
        created: Date.now(),
        role: newRole || "disabled", //TODO: Rol de la gente cuando el admin les autoriza? people?
      });
      newUser.password =  newUser.generateHash(cart.pass);
      newUser.save(function(err) {
        if (err){
          logger.error("Can't save user in DB: "+JSON.stringify(err.stack));
          req.flash("info", "Ha ocurrido un error técnico");
          res.redirect(303, "/register");
        }
        
        //TODO: Revisar en que caso se mandan mails y no permitir acceder a los usuarios que aún no han sido autorizados. 
        res.render("email/email_lite", {layout: null, cart}, function(err,html){
          if(err) logger.error("Problems generating email: "+JSON.stringify(err.stack));
          mailTransport.sendMail({
            from: '"mitube": '+credentials.gmail.user,
            to: cart.email,
            subject: "Información sobre tu usuario",
            html: html,
            generateTextFromHtml: true
          }, function(err){
            if(err) logger.error("Unable to send email: "+JSON.stringify(err.stack));  
          });
        });
        logger.debug("User saved to DB");
  
        req.flash("info", "Usuario dado de alta. Debe esperar a que el administrador autorice su acceso. Recibirá un email de confirmación");
        res.redirect(303, "/register");
      });
    }
  }).catch(err => {
    logger.error("Problems searching if exists User or max MAC: "+JSON.stringify(err.stack));
    req.flash("info", "Error. Reintentar registro");
    res.redirect(303, "/register");
  });
});


app.get('/wait', function(req, res){
  var context = {
    userdata: res.locals.userdata,
  };
  logger.debug("Context: "+JSON.stringify(context));

  res.render('wait', context);
});

app.get('/about', function(req, res){
  var context = {
    userdata: res.locals.userdata,
    active: {"about": true},
  };
  logger.debug("Context: "+JSON.stringify(context));

  res.render('about', context);
});

app.get('/manual', function(req, res){
  var context = {
    userdata: res.locals.userdata,
    active: {"manual": true},
  };
  logger.debug("Context: "+JSON.stringify(context));

  res.render('manual', context);
});

app.get('/user', isLoggedIn, function(req, res){
  ListUser.find({email:req.session.userdata.email}, function(err, lists){ 
    var context = {
      userdata: res.locals.userdata,
      lists: lists.map(function(list){
        return {
          listId: list.listId,
          name: list.name,
          created: moment(list.created).format('DD MMM YYYY'),
          sync: list.sync,
        }
      }),
      active: {"user": true},
    };
    logger.debug("Context: "+JSON.stringify(context));
    
    res.render('user', context);
  });
});

app.post('/user', isLoggedIn, function(req, res){

  if (req.body.action == "updateUser"){ 
    var email = req.body.email;

    Synchronize.checkUpdatedUser(credentials.youtube.apiKey, email).then(returnObject => {
      logger.debug("Comprobadas todas las listas del usuario");
    }).catch(err => {
      console.log(err);
    });

    logger.debug("Lanzada comprobación listas usuario");
  } else if (req.body.action == "newList") {
    //TODO: Meter aquí lo de process-user


    logger.debug("Añadida nueva lista");
  }

  return res.redirect(303, '/user');
});

app.post('/process-user', function(req, res){

  if (req.body.url.includes("http"))
    var listId = req.body.url.split("list=")[1];
  else
    var listId = req.body.url;

  Promise.all([
    ListUser.find({email:req.session.userdata.email, listId: listId}).countDocuments(),
    ListUser.find({email:req.session.userdata.email, name: req.body.name}).countDocuments()
  ]).then( ([ usedId, usedName ]) => {

    if (usedId){
      logger.debug("URL ya utilizada en otra lista del usuario.");
      return res.redirect(303, '/user');
    }

    if (usedName){
      logger.debug("Nombre ya utilizado en otra lista del usuario.");
      return res.redirect(303, '/user');
    }

    Synchronize.createRelation(credentials.youtube.apiKey, listId, req.body.name, req.session.userdata.email)
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
      ListUser.findOne({email:req.session.userdata.email, listId: req.query.listid}),
      List.findOne({listId:req.query.listid})
    ]).then( ([listUser, list]) => {
      if (listUser == null || list == null){
        logger.debug("Lista sin detalles almacenados.");
        return res.redirect(303, '/user');
      }

      console.log(listUser);
  
      var context = {
        userdata: res.locals.userdata,
        listId: req.query.listid,
        created: moment(listUser.created).format('DD MMM YYYY  HH:mm'),
        modified: moment(list.modified).format('DD MMM YYYY  HH:mm') || null,
        name: listUser.name,
        nameYT: list.nameYT,
        numSongs: list.songs.length,
        sync: listUser.sync,
        songs: list.songs.map(function(song){
          return {
              songId: song.songId,
              originalName: song.originalName,
              name: song.name,
              artist: song.artist,
              added: moment(song.added).format('DD MMM YYYY')
            }
        })
      };
      logger.debug("Context: "+JSON.stringify(context));

      res.render('list', context);
    });
  }).catch(error => {
    logger.error("Can't check if list is updated - "+error);
    res.render('list', context);
  });
});

app.post('/list', isLoggedIn, function(req, res){

  if (req.body.action == "syncToogle"){ 
    var email = res.locals.userdata.email,
        listId = req.body.listId,
        sync = req.body.sync;

    Synchronize.toogleSync(email, listId, sync);
  }

  return res.redirect(303, '/list?listid='+listId);
});


app.all('/gmusic', isLoggedIn, function(req, res){
  var authCode = req.body.authCode || null;
  logger.debug("El codigo es: "+authCode);
  
  User.findOne({email:req.session.userdata.email}).then(user => {
    Gmusic.getAuth(req.session.userdata.email, user.mac, authCode).then(response => {
      logger.debug("He terminado getAuth - Valor respuesta: "+JSON.stringify(response));
  
      if (response.code == 0) {
        logger.debug(req.session.userdata.email+": Usuario autorizado googleMusic.");

        req.session.userdata.home = "/";
        //Tras la inclusión de "home", me hace falta seguir teniendo gmusicAuth?
        req.session.userdata.gmusicAuth = true; 
        res.redirect(303, '/user'); 
      } else {
        var context = {
          userdata: res.locals.userdata,
          message: response.message,
          urlAuth: response.url,
        };
        logger.debug(context);

        if (response.code == 1)
          logger.debug(req.session.userdata.email+": Usuario sin autorización googleMusic.");
        else
          logger.debug(req.session.userdata.email+": Clave autorización introducida inválida o usuario no dado de alta en googleMusic.");
        
        res.render('gmusic', context);
      }
    }).catch(err => {
      logger.error("Gmusic coudn't be reached.");
      res.redirect(303, '/logout');
    });
  });
});

app.get('/admin', adminOnly, function(req, res){

  Promise.all([
    User.find({role: "disabled"}),
    WorkTodo.find({state: {$in: [/^err/]}}),
  ]).then( ([disabledUsers, errorWorks]) => {

    console.log(disabledUsers);
    console.log(errorWorks);
    var context = {
      active: {"admin": true},
      userdata: res.locals.userdata,
      disabledUsers: disabledUsers.map(function(user){
        return {
          username: user.username,
          email: user.email,
          created: moment(user.created).format('DD MMM YYYY'),
        }
      }),
      works: errorWorks.map(function(work){
        return {
          songId: work.songId,
          listName: work.listName,
          email: work.email,
          state: work.state,
          date: work.dateLastMovement,
         }
      }),
    };
    
    res.render('admin', context);
  }).catch(err => {
    logger.debug("Impossible to load admin data. Err: "+JSON.stringify(err.stack));
  });
});


app.post("/admin", adminOnly, function(req, res){
  if (req.body.action == "auth"){
    if (req.body.value == "OK"){
      User.findOneAndUpdate(
        {email: req.body.email},
        {$set: {role: "basic"}}, function(err){
          logger.debug("User "+req.body.email+" given access.");
        }
      );
    } else {
      User.findOneAndUpdate(
        {email: req.body.email},
        {$set: {role: "rejected"}}, function(err){
          logger.debug("User "+req.body.email+" not allowed.");
        }
      );
    }
  }

  return res.redirect(303, "/admin");
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


//COMENTAR CUANDO ESTOY CON INTERNET MOVIL PARA NO GASTAR DATOS
// Call to daemon:
// const child = spawn('node ./daemon.js', {
//   stdio: 'inherit',
//   shell: true
// });