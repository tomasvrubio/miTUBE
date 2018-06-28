var express = require('express'),
    favicon = require('express-favicon'),
    nodemailer = require('nodemailer'),
    fs = require('fs'),
    flash = require('connect-flash'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    LocalStrategy = require('passport-local'),
    passportLocalMongoose = require('passport-local-mongoose'),
    credentials = require('./credentials.js'), 
    List = require('./models/list.js'),
    ListUser = require('./models/listUser.js'),
    User = require('./models/user.js');
    //Utilizamos un fichero con las credenciales. Importante que no sincronice con el repositorio.


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

//passport.use(new LocalStrategy(User.authenticate()));
// passport.use(new LocalStrategy({
//     usernameField: 'email',
//     passwordField: 'password'
//   }, 
//   //User.authenticate()
//   function(req, username, password, done){
//     User.findOne({email:username}, function(err, user){
//       if (err) { return done(err); }
//       if (!user){
//         console.log('Usuario incorrecto');
//         return done(null, false, {message:'mensaje'});
//       }
//       if (!user.validPassword(password)){
//         console.log('Contraseña incorecta');
//         return done(null, false, {message:'mensaje'});
//       }
//       return done(null, user);
//     })
//   }
// ));
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
// passport.use(new LocalStrategy({
//     // by default, local strategy uses username and password, we will override with email
//     usernameField : 'email',
//     passwordField : 'password',
//     passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
//   },
//   function(req, email, password, done) {
//     if (email)
//         email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

//     // asynchronous
//     process.nextTick(function() {
//         User.findOne({'email' : email }, function(err, user) {
//             // if there are any errors, return the error
//             if (err)
//                 return done(err);

//             // if no user is found, return the message
//             if (!user)
//                 return done(null, false);

//             if (!user.validPassword(password)){
//               console.log("La password es mala");
//               return done(null, false);
//             }
                

//             // all is well, return user
//             else
//                 return done(null, user);
//         });
//   });
// }));

// //Vamos a usar este:
// passport.use(new LocalStrategy({
//     // by default, local strategy uses username and password, we will override with email
//     usernameField : 'email',
//     passwordField : 'password',
//     passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
//   }, 
//   function(req, email, password, done) {
//     User.findOne({ 'email': email }, function(err, user) {
//       //console.log(arguments);
//       if (err) { 
//         return done(err); 
//       }
//       if (!user) {
//         return done(null, false, { message: 'Incorrect username.' });
//       }
//       if (!user.validPassword(password)) {
//         return done(null, false, { message: 'Incorrect password.' });
//       }
//       return done(null, user);
//     });
//   }
// ));



// =========================================================================
// LOCAL LOGIN =============================================================
// =========================================================================
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
        else
            return done(null, user);
      });
    });
  }
));

// =========================================================================
// LOCAL SIGNUP ============================================================
// =========================================================================
passport.use('local-signup', new LocalStrategy({
    // by default, local strategy uses username and password, we will override with email
    usernameField : 'email',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
  },
  function(req, email, password, done) {
    if (email)
        email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

    password = Math.random().toString().replace(/^0\.0*/, '');

    // asynchronous
    process.nextTick(function() {
      // if the user is not already logged in:
      if (!req.user) {
        User.findOne({ 'email' : email }, function(err, user) {
          // if there are any errors, return the error
          if (err)
            return done(err);

          // check to see if theres already a user with that email
          if (user) {
            return done(null, false);
          } else {
            // create the user
            var newUser = new User();
            newUser.email    = email;
            newUser.password = newUser.generateHash(password);
            newUser.save(function(err) {
              if (err)
                return done(err);

              //Enviamos mail con la password al usuario
              var cart = "";
              cart = {
                // name: name,
                email: email,
                pass: Math.random().toString().replace(/^0\.0*/, ''),
              };
              console.log('Email: ' + cart.email + ' y password: ' + cart.pass);
              res.render('email/email_lite',
                { layout: null, cart: cart }, function(err,html){
                        if( err ) console.log('error in email template');
                        mailTransport.sendMail({
                            from: '"miTUBE": desarrollovazquezrubio@gmail.com',
                            to: email,
                            subject: 'Here is your login information',
                            html: html,
                            generateTextFromHtml: true
                        }, function(err){
                                if(err) console.error('Unable to send confirmation: ' + err.stack);
                        });
                    }
              );

              return done(null, newUser);
            });
          }
        });
      // if the user is logged in but has no local account...
      } else {
        // user is logged in and already has a local account. Ignore signup. (You should log out before trying to create a new account, user!)
        return done(null, req.user);
      }
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


//Introducimos datos en BBDD en caso de que no existan:
ListUser.find(function(err, lists){
  if(lists.length) return; //En caso de que ya existan usuarios no hace falta crear información

  new ListUser({
    name: 'Despierta',
    user: 'Tomas',
    created: "2007,08,10",
  }).save();

  new ListUser({
    name: 'Vive',
    user: 'Tomas',
    created: "2012,10,02",
  }).save();

  new ListUser({
    name: 'Piensa',
    user: 'Pedro',
    created: "2018,06,07",
  }).save();
});


//--------------Routing
app.get('/', function(req, res){
  var context = { name: req.session.username || "Anonymous",
                  csrf: 'CSRF token goes here'};
  res.render('home', context);
});

app.post('/process-home', passport.authenticate("local",{
    successRedirect: "/user",
    failureRedirect: "/",
    //failureFlash: 'Invalid username or password.' //Me falla porque dice que no encuentra req.flash
  }), function(req, res){
    console.log("He pasado por validación");
    //req.session.userName = req.body.name; 

    //console.log(req.session);
    //res.redirect(303, '/');
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
  res.render('about');
});

app.get('/user', function(req, res){
  ListUser.find({user:req.session.userName}, function(err, lists){ 
    var context = {
        lists: lists.map(function(list){
            return {
                user: list.user,
                name: list.name,
                created: list.created,
            }
        })
    };
    console.log(context);
    res.render('user', context);
  });
});

app.post('/process-user', function(req, res){
  console.log(req.body);
  //TODO: Asegurarnos que es una URL de lista de youtube. Después realizar 2 pasos: Introducirlo en tabla de listas y sincronizarla con el usuario en la tabla de relaciones.
  ListUser.insertMany(
    {user: req.session.userName, name: req.body.name},
    function(err){
      if(err) {
          console.error(err.stack);
          return res.redirect(303, '/user');
      }
      return res.redirect(303, '/user');
    }
  );
});

app.get('/list', function(req, res){
  res.render('list');
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