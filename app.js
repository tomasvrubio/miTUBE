var express = require('express'),
    favicon = require('express-favicon'),
    nodemailer = require('nodemailer'),
    fs = require('fs'),
    flash = require('connect-flash'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    LocalStrategy = require('passport-local'),
    passportLocalMongoose = require('passport-local-mongoose'),
    moment = require('moment'),
    credentials = require('./credentials.js'), 
    List = require('./models/list.js'),
    ListUser = require('./models/listUser.js'),
    User = require('./models/user.js');
    //Utilizamos un fichero con las credenciales. Importante que no sincronice con el repositorio.

var Youtube = require('./lib/youtube.js')();
// Youtube.search(credentials.youtube.apiKey, 'PLTOZ3CU8NJdQjXnfpYNMGrHkCQHc9p3iW').then(playlistItems => {
//   //console.log(playlistItems);
//   console.log('Longitud de playlist: '+ playlistItems.length);
// }).catch(console.error);




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

//passport.serializeUser(User.serializeUser());
//passport.deserializeUser(User.deserializeUser());
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


app.use(function(req, res, next){
  console.log("Petición: " + req.url)
  console.log(req.session);
  next();
});


//Introducimos datos en BBDD en caso de que no existan:
ListUser.find(function(err, lists){
  if(lists.length) return; //En caso de que ya existan usuarios no hace falta crear información

  new ListUser({
    name: 'Despierta',
    email: 'tomasvrubio@gmail.com',
    created: "2007,08,10",
  }).save();

  new ListUser({
    name: 'Vive',
    email: 'tomasvrubio@gmail.com',
    created: "2012,10,02",
  }).save();

  new ListUser({
    name: 'Piensa',
    email: 'pedrin@gmail.com',
    created: "2018,06,07",
  }).save();
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

  //console.log(req.isAuthenticated());

  var context = {
    logged: req.isAuthenticated(),
    name: req.session.username || "Anonymous",
    csrf: 'CSRF token goes here'
  };
  res.render('home', context);
});

app.post('/process-home', passport.authenticate("local-login",{
    successRedirect: "/user",
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
    pass: Math.random().toString().replace(/^0\.0*/, '')
  };
  console.log(cart); //A eliminar

  User.findOne({'email' : cart.email}, function(err, user){
    if (err){
      console.log("Error consulta BBDD");
      console.log(err);
      res.render('register', {message: "Ha ocurrido un error técnico"});
    }

    if (user){
      console.log("Usuario ya existente");
      res.render('register', {message: "Usuario ya registrado previamente"});
    } else {
      var newUser = new User({
        username: cart.name,
        email: cart.email,
        created: Date.now(),
        role: "deactivated"
      });
      newUser.password =  newUser.generateHash(cart.pass);
      newUser.save(function(err) {
        if (err){
          console.log("Error guardando en BBDD");
          console.log(err);
          res.render('register', {message: "Ha ocurrido un error técnico"});
        }
        
        res.render('email/email_lite', { layout: null, cart: cart }, function(err,html){
          if(err) console.log('error in email template');
          mailTransport.sendMail({
            from: '"miTUBE": desarrollovazquezrubio@gmail.com',
            to: cart.email,
            subject: 'Here is your login information',
            html: html,
            generateTextFromHtml: true
          }, function(err){
            if(err) console.error('Unable to send confirmation: ' + err.stack);
          });
        });
        console.log("Usuario almacenado en BBDD");
        res.render('register', {message: "Usuario dado de alta. Debe esperar a que el administrador autorice su acceso."});
      });
    }
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
//    console.log(context);
    res.render('user', context);
  });
});

app.post('/process-user', function(req, res){
  //console.log(req.body);

  var listId = req.body.url.split("list=")[1];
  if (listId != null) {
    //Como paro la ejecución de promesas???

    Promise.all([
      ListUser.find({email:req.session.email, listId: listId}).count(),
      ListUser.find({email:req.session.email, name: req.body.name}).count()
    ]).then( ([ usedId, usedName ]) => {

      if (usedId){
        console.log("URL ya utilizada en otra lista.");
        return res.redirect(303, '/user');
      }

      if (usedName){
        console.log("Nombre ya utilizado en otra lista.");
        return res.redirect(303, '/user');
      }

      //Obtenemos los datos generales de la lista de Youtube
      Youtube.listInfo(credentials.youtube.apiKey, listId).then(playlistInfo => {
  
        //console.log(playlistInfo);
        //En caso de que sea una lista válida de Youtube
        if (playlistInfo.pageInfo.totalResults == 1){
          ListUser.insertMany({
            listId: listId, 
            name: req.body.name, 
            email: req.session.email, 
            created: Date.now()
          },function(err){
              if(err) console.error(err.stack);
          });
          //console.log(playlistInfo.items[0].snippet.title);
          console.log("Lista insertada en BBDD");
          //Obtenemos los datos de cada una de las canciones de la lista de Youtube
          Youtube.listItems(credentials.youtube.apiKey, listId).then(playlistItems => {
            var itemsMapped = playlistItems.map(function(item){
              return {
                songId: item.resourceId.videoId,
                originalName: item.title,
                added: item.publishedAt                  
              }
            });

            console.log(itemsMapped);

           //Insertamos las canciones en la tabla de detalle de lista
            List.insertMany({
              listId: listId,
              nameYT: playlistInfo.items[0].snippet.title,
              songs: itemsMapped
            },function(err){
              if (err) console.error(err.stack);
            });
          });
        } else {
          console.log("Url no válida como lista de Youtube");
        }
        return res.redirect(303, '/user');
      }).catch(console.error);
      
    });
  } 
  else {
    console.log("Url no válida como lista de Youtube");
    return res.redirect(303, '/user');
  }
});

app.get('/list', isLoggedIn, function(req, res){

  Promise.all([
    ListUser.findOne({email:req.session.email, listId: req.query.listid}),
    List.findOne({listId:req.query.listid})
  ]).then( ([listUser, list]) => {
    if (listUser == null || list == null){
      console.log("Lista sin detalles almacenados.");
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

    console.log(context);
    res.render('list', context);
  });

  // List.findOne({listId:req.query.listid}, function(err, list){
  //   if (list == null){
  //     console.log("Lista sin detalles");
  //     return res.redirect(303, '/user');
  //   }      

  //   var context = {
  //     logged: req.isAuthenticated(),
  //     nameYT: list.nameYT,
  //     songs: list.songs.map(function(song){
  //       return {
  //           songId: song.songId,
  //           name: song.originalName,
  //           added: moment(song.added).format('DD / MM / YYYY')
  //         }
  //     })
  //   };
  //   console.log(context);
  //   res.render('list', context);
  // });
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
  console.log( 'Express started on http://localhost:' + app.get('port') + ' press Ctrl-C to terminate.' );
});