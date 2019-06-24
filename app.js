var express = require('express'),
    favicon = require('express-favicon'),
    nodemailer = require('nodemailer'),
    flash = require('connect-flash'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    LocalStrategy = require('passport-local'),
    moment = require('moment'),
    morgan = require('morgan'),
    credentials = require('./credentials.js'), 
    spawn = require("child_process").spawn,
    cron = require("node-cron"),
    List = require('./models/list.js'),
    ListUser = require('./models/listUser.js'),
    WorkTodo = require('./models/workTodo.js'),
    User = require('./models/user.js');
    //Utilizamos un fichero con las credenciales. Importante que no sincronice con el repositorio.

var UserManagement = require('./lib/userManagement.js')(),
    Synchronize = require('./lib/synchronize.js')(),
    Gmusic = require('./lib/gmusic.js')(),
    YoutubeDL = require('./lib/youtubedl')(),
    logger = require('./lib/logger');

var handlebars = require('express-handlebars').create({
    defaultLayout:'main',    
    helpers: require('handlebars-helpers')(), 
});

var app = express();
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('port', credentials.port || 3000);


app.use(morgan(':remote-addr - :remote-user ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"', { stream: logger.stream }));

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


app.use(flash());

//Pintamos las peticiones mientras seguimos desarrollando para saber el flujo de la aplicación
//TODO: A eliminar
app.use(function(req, res, next){
  logger.debug("Session data: "+JSON.stringify(req.session));
  logger.silly("Request body: "+JSON.stringify(req.body));

  return next();
});

//Add userData to context
app.use(function(req, res, next){
  if (req.session.userdata == null) {
    res.locals.userdata = {
      logged: req.isAuthenticated(),
      admin: false,
      gmusicAuth: false,
      home: "/mitube",
      username: "Anonymous",
    };

    return next();
    
  } else {
    //Para los usuarios creados pero que aún no tienen permiso en la aplicación
    if ( req.session.userdata.role == "disabled" && ["/process-home", "/about", "/manual", "/logout", "/wait"].indexOf(req.url) == -1 ){
      User.findOne({email: req.session.userdata.email}, {"_id":0, "role":1}, function(err, user) {
        
        if (user.role == "disabled"){
          return res.redirect(303, "wait");
        
        } else {
          res.locals.userdata = req.session.userdata;
          res.locals.userdata.logged = req.isAuthenticated();
          res.locals.userdata.role = user.role;
          return next();
        }
      });

    } else {
      res.locals.userdata = req.session.userdata;
      res.locals.userdata.logged = req.isAuthenticated();
      if (res.locals.userdata.logged == false) res.locals.userdata.home = "/mitube";
      return next();
    }       
  } 	
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
    return res.redirect(303, 'user');

  req.session.userdata = {};

  var context = {
    userdata: res.locals.userdata,
    csrf: 'CSRF token goes here',
    alert: req.flash("error") || null,
    active: {"home": true},
  };

  //logger.debug(req.flash("error"));
  logger.silly("Context: "+JSON.stringify(context));

  res.render('home', context);
});


app.post('/process-home', passport.authenticate("local-login",{
    //successRedirect: " ", //Sin este parámetro se va a la función de abajo en caso de éxito
    failureRedirect: "/mitube",
    failureFlash: "Usuario o contraseña inválidos"
  }), function(req, res){

    if (req.session.userdata.role == "disabled"){
      req.session.userdata.home = "gmusic";
      res.redirect(303, 'wait');
    } else { //En caso de que si que tenga rol lo que hay que hacer es mandarle a /gmusic
      req.session.userdata.home = "gmusic"
      res.redirect(303, 'gmusic');
    }    
});


app.get('/logout', isLoggedIn, function(req, res){
  req.logout();
  req.session.userdata = {};
  res.redirect(303, '/mitube');
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
  var name = req.body.name;
  var email = req.body.email.toLowerCase();

  if (!email.endsWith("@gmail.com")){
    logger.debug("Not gmail account");
    req.flash("info", "Para poder utilizar la aplicación hay que registrarse con un correo de GMAIL");
    return res.redirect(303, "register");
  }

  UserManagement.createUser(email, name, credentials.gmail.user, res, mailTransport).then(confirmation => {
    if (confirmation == "OK"){
      req.flash("error", "Usuario dado de alta. Ha sido enviada la contraseña a su email pero debe esperar a que le autoricen el acceso.");
      return res.redirect(303, "/mitube");
    } else if (confirmation == "KO"){
      req.flash("info", "Usuario ya registrado previamente. Utilice otro email");
      return res.redirect(303, "register");
    }
  }).catch(err => {
    //In case is the first user of APP the function will return an error so we have to try it again.  
    UserManagement.createFirstUser(email, name, credentials.gmail.user, res, mailTransport).then(confirmation => {
      req.flash("error", "ADMIN Creado.");
      return res.redirect(303, "/mitube");
    }).catch(err => {
      req.flash("info", "Error. Reintentar registro");
      return res.redirect(303, "register");
    });
  });

});


app.get('/wait', function(req, res){
  var context = {
    userdata: res.locals.userdata,
  };
  logger.silly("Context: "+JSON.stringify(context));

  res.render('wait', context);
});


app.get('/about', function(req, res){
  var context = {
    userdata: res.locals.userdata,
    active: {"about": true},
  };
  logger.silly("Context: "+JSON.stringify(context));
 
  res.render('about', context);
});


app.get('/manual', function(req, res){
  var context = {
    userdata: res.locals.userdata,
    active: {"manual": true},
  };
  logger.silly("Context: "+JSON.stringify(context));

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
      alert: req.flash("info") || null,
      success: req.flash("success") || null,
    };
    logger.silly("Context: "+JSON.stringify(context));
    
    res.render('user', context);
  });
});


app.post('/user', isLoggedIn, function(req, res){

  if (req.body.action == "updateUser"){ 
    var email = req.body.email;

    //TODO: Si no hay ninguna lista registrada en la aplicación se queda cargando eternamente. CONTROLARLO

    Synchronize.checkUpdatedUser(credentials.youtube.apiKey, email).then(returnObject => {
      logger.debug("Comprobadas todas las listas del usuario");
      return res.json({success: true}); 
    }).catch(err => {
      logger.error(JSON.stringify(err));
      return res.json({success: false});
    });  


  } else if (req.body.action == "newList") {

    if (req.body.url.includes("http"))
      var listId = req.body.url.split("list=")[1];
    else
      var listId = req.body.url;

    //TODO: Comprobar que la lista que ha introducido no tiene sus dos primeras siglas como RD.
    if (listId.substring(0,2) == "RD") {
      logger.debug("Introducida url de mix generado automáticamente por Youtube. No válido.");
      req.flash("info", "No se pueden utilizar Mixes generados automáticamente por Youtube.");
      return res.redirect(303, 'user');
    }


    Promise.all([
      ListUser.find({email:req.session.userdata.email, listId: listId}).countDocuments(),
      ListUser.find({email:req.session.userdata.email, name: req.body.name}).countDocuments()
    ]).then( ([ usedId, usedName ]) => {

      if (usedId){
        logger.debug("URL ya utilizada en otra lista del usuario.");
        req.flash("info", "URL ya utilizada en otra lista del usuario.");
        return res.redirect(303, 'user');
      }

      if (usedName){
        logger.debug("Nombre ya utilizado en otra lista del usuario.");
        req.flash("info", "Nombre ya utilizado en otra lista del usuario.");
        return res.redirect(303, 'user');
      }

      Synchronize.createRelation(credentials.youtube.apiKey, listId, req.body.name, req.session.userdata.email)
      .then(nameYT => {
        Synchronize.createList(credentials.youtube.apiKey, listId, nameYT).then(returnObject => {
          Synchronize.generateWorkUpload(listId).then(returnObject => {
            logger.debug("Canciones metidas en workTodo.");
          });//.catch(console.error);
          req.flash("success", "Nueva lista creada.");
          return res.redirect(303, 'user');
        });//.catch(console.error);
      }).catch(err => {
        logger.error(JSON.stringify(err.stack));
        logger.debug("Url no válida como lista de Youtube. Asegúrate de que la lista no sea privada.");
        req.flash("info", "URL no válida como lista de Youtube.");
        return res.redirect(303, 'user');
      }); 
    });
  }
});


app.get('/list', isLoggedIn, function(req, res){

  Synchronize.checkUpdatedList(credentials.youtube.apiKey, req.query.listid).then(returnObject => {
    logger.debug("Comprobada lista "+req.query.listid);
  }).catch(error => {
    logger.error("Can't check if list is updated - "+error); 
  }).then(returnObject => {

    Promise.all([
      ListUser.findOne({email:req.session.userdata.email, listId: req.query.listid}),
      List.findOne({listId:req.query.listid}),
      WorkTodo.find({email:req.session.userdata.email, listId: req.query.listid, state:{$ne:"img"}},{"_id":0, "songId":1, "state":1, "dateLastMovement":1}).sort({dateLastMovement:1}),
      Synchronize.getImages(),
    ]).then( ([listUser, list, works, covers]) => {
      if (listUser == null || list == null){
        logger.debug("Lista sin detalles almacenados.");
        return res.redirect(303, 'user');
      }

      pendingWorks = Object.assign({}, ...works.map(work => ({[work.songId]: work.state})));
      
      var context = {
        userdata: res.locals.userdata,
        listId: req.query.listid,
        created: moment(listUser.created).format('DD MMM YYYY  HH:mm'),
        modified: moment(list.modified).format('DD MMM YYYY  HH:mm') || null,
        name: listUser.name,
        nameYT: list.nameYT,
        numSongs: list.songs.length,
        numWorks: Object.keys(pendingWorks).length|| 0,
        sync: listUser.sync,
        imageId: listUser.imageId.replace("covers/","covers/thumbnail/thumbnail-"),
        covers,
        songs: list.songs.map(function(song){
          return {
              songId: song.songId,
              originalName: song.originalName,
              name: song.name,
              artist: song.artist,
              state: pendingWorks[song.songId],
              added: moment(song.added).format('DD MMM YYYY')
            }
        })
      };
      logger.silly("Context: "+JSON.stringify(context));

      res.render('list', context);
    });
  });

});


app.post('/list', isLoggedIn, function(req, res){
  var action = req.body.action,
      email = res.locals.userdata.email,
      listId = req.body.listId,
      listName = req.body.listName,
      songId = req.body.songId;

  if (action == "syncToogle"){ 
    var sync = req.body.sync;

    Synchronize.toogleSync(email, listId, sync);
    return res.redirect(303, 'list?listid='+listId);
  
  } else if (action == "setImage") {
    var imageId = req.body.imageId;
    
    Synchronize.setImage(email, listId, listName, songId, imageId).then(returnObject => {
      return res.json({success: true}); 
    }).catch(err => {
      logger.error(JSON.stringify(err));
      return res.json({success: false});
    }); 
  }

});


app.post('/deleteList', isLoggedIn, function(req, res){

  var email = res.locals.userdata.email,
      listId = req.body.listId;

  console.log(email);

  Synchronize.deleteRelation(email, listId).then(returnObject => {
    logger.debug("Eliminada lista "+listId);
  }).catch(err => {
    logger.error("No se ha podido eliminar la lista - "+JSON.stringify(err.stack)); 
  }).then(() => {
    return res.redirect(303, 'user'); 
  });

});


app.all('/gmusic', isLoggedIn, function(req, res){
  var authCode = req.body.authCode || null;
  var action = req.query.action || "upl";
  logger.debug("La accion es: "+action);
  logger.debug("El codigo es: "+authCode);
  
  User.findOne({email:req.session.userdata.email}).then(user => {
    Gmusic.getAuth(action, req.session.userdata.email, user.mac, authCode).then(response => {
      logger.debug("He terminado getAuth - Valor respuesta: "+JSON.stringify(response));
  
      if (response.code == 0) {
        logger.debug(req.session.userdata.email+": Usuario autorizado googleMusic para la acción "+action+".");

        if (action == "upl") {
          res.redirect(303, 'gmusic?action=del');
        } else {
          req.session.userdata.home = "/mitube";
          req.session.userdata.gmusicAuth = true; 
          res.redirect(303, 'user');
        } 
      } else {
        var context = {
          action,
          userdata: res.locals.userdata,
          message: response.message,
          urlAuth: response.url,        
        };
        logger.silly("Context: "+JSON.stringify(context));

        if (response.code == 1)
          logger.debug(req.session.userdata.email+": Usuario sin autorización googleMusic.");
        else
          logger.debug(req.session.userdata.email+": Clave autorización introducida inválida o usuario no dado de alta en googleMusic.");
        
        res.render('gmusic', context);
      }
    }).catch(err => {
      logger.error("Gmusic coudn't be reached.");
      res.redirect(303, 'logout');
    });
  });
});


app.get('/admin', adminOnly, function(req, res){

  Promise.all([
    User.find({role:{$ne:"rejected"}},{_id:0, email:1, username:1, created:1, role:1}),
    ListUser.aggregate([
      {"$group":{
        "_id":"$email", 
        "lists":{"$sum":1}, 
        "last":{"$max":"$created"}, 
        "mod":{"$max":"$updated"}
      }}
    ]),
    WorkTodo.aggregate([
      {"$group":{
        "_id":{"user":"$email","state":"$state"},
        "counts":{"$sum":1}
      }},
      {"$group":{
        "_id":"$_id.user",
        "total":{"$sum":"$counts"},
        "movements":{"$push":{"state":"$_id.state","count":"$counts"}}
      }}
    ]),
  ]).then( ([allUsers, listInfo, currentWork]) => {

    //Distinguimos los dos grupos de usuarios
    activeUsers = allUsers.filter( user => { return user.role != "disabled"});
    disabledUsers = allUsers.filter( user => { return user.role == "disabled"});
    
    //Creamos tabla de listas por usuario
    userListInfo = Object.assign({}, ...listInfo.map( function(user){ 
      return {
        [user._id]: {
          "num": user.lists, 
          "last": user.last, 
          "mod": user.mod
        }
      }
    }));

    //Creamos tabla de trabajos por usuario
    userCurrentWork = Object.assign({}, ...currentWork.map( function(user){
      return {
        [user._id] : {
           "total": user.total, 
           "movements": Object.assign({}, ...user.movements.map(mov => ({[mov.state]: mov.count})))
        }
      }
    }));

    //Juntamos todos los resultados
    userAdminInfo = activeUsers.map(function(user){
      return {
        email: user.email.split("@")[0],
        lists: userListInfo[user.email] ? userListInfo[user.email].num : 0,
        lastInc: userListInfo[user.email] ? moment(userListInfo[user.email].last).format('DD MMM YYYY') : null,
        lastMod: userListInfo[user.email] ? moment(userListInfo[user.email].mod).format('DD MMM YYYY') : null,
        total: userCurrentWork[user.email] ? userCurrentWork[user.email].total : 0,
        movements: userCurrentWork[user.email] ? userCurrentWork[user.email].movements : {},
      }
    }); 
    
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
      userAdminInfo,
      currentWork: currentWork.map(function(work){
        return {
          email: work._id,
          total: work.total,
          movements: Object.assign({}, ...work.movements.map(mov => ({[mov.state]: mov.count}))),
        }
      }),
      daemonStatus: (credentials.daemon.active ? !daemon._closesGot : false), 
    };
    
    res.render('admin', context);
  }).catch(err => {
    logger.debug("Impossible to get admin data. Err: "+JSON.stringify(err.stack));
  });
});


app.post("/admin", adminOnly, function(req, res){
  if (req.body.action == "auth"){
    
    var parms = {
      email: req.body.email,
      value: req.body.value,
    };
    UserManagement.authUser(parms, credentials.gmail.user, res, mailTransport);
    res.redirect(303, 'admin');

  } else if (req.body.action == "update") {
    
    YoutubeDL.updateTool().then(returnObject => {
      logger.debug("Youtube-dl actualizado.");
      return res.json({success: true});
    }).catch(err => {
      logger.error(JSON.stringify(err));
      return res.json({success: false});
    });
  
  } else if (req.body.action == "syncAll") {

    Synchronize.checkUpdatedAll(credentials.youtube.apiKey).then(returnObject => {
      logger.debug("Comprobadas todas las listas de la aplicación");
      return res.json({success: true});
    }).catch(err => {
      logger.error(JSON.stringify(err));
      return res.json({success: false});
    });

    //TODO: Si no hay ninguna lista registrada en la aplicación se queda cargando eternamente. CONTROLARLO

  } else if (req.body.action == "retryDownload") {

    Synchronize.retryDownload().then(returnObject => {
      logger.debug("Reintento errores: Trabajos en estado 'err-dwn' pasados a 'new'");
      return res.json({success: true});
    }).catch(err => {
      logger.error(JSON.stringify(err));
      return res.json({success: false});
    });

  } else if (req.body.action == "exit") {
    logger.error("Atendiendo petición para apagar el servidor.");
    
    if (daemon) {
      logger.error(JSON.stringify(daemon));
      logger.error("Demonio levantado. Procedemos a pararlo.");
      process.kill(daemon.pid);
      logger.error("Demonio Parado.");
    }    

    return process.exit(0);
  }

});


// custom 404 page
app.use(function(req, res){
  res.status(404);
  res.render('404');
});


// custom 500 page
app.use(function(err, req, res, next){
  logger.error(JSON.stringify(err.stack));
  res.status(500);
  res.render('500');
});



app.listen(app.get('port'), function(){
  logger.info( 'Express started on http://localhost:' + app.get('port') + ' press Ctrl-C to terminate.' );
});

//Programamos un job para que se ejecute todos los días a las 03:00 y sincronice las canciones de toda la aplicación
cron.schedule('00 03 * * *', () => {
  
  Synchronize.checkUpdatedAll(credentials.youtube.apiKey).then( () => {
    logger.info("Comprobadas todas las listas de la aplicación");
  }).catch(err => {
    logger.error(JSON.stringify(err));
  });

});


// Call to daemon: //TODO: Tengo que escuchar al demonio y si presenta algún problema ir reportando sus mensajes o volver a levantarlo. También tendría que poder pararlo y arrancarlo a través del menú del administrador.
if (credentials.daemon.active) {
  //TODO: Comprobar si ya existe algún proceso de demonio en la máquina. Si ya existe apagar el servidor indicando que hay que terminar ese proceso.

  var daemon = spawn('node ./daemon.js', {
    stdio: 'inherit',
    shell: true,
    detached: true,
  });

  // console.log(daemon);

  process.on("SIGINT", function(code) {
    logger.error("Recibido SIGINT (Ctrl + c). Paramos demonio.");
    process.kill(daemon.pid);
    logger.error("Demonio Parado.");
    // console.log(daemon);
    return process.exit(0);
  });

  daemon.on("exit", function (code, signal) {
    logger.debug("spawnEXIT DAEMON: With code "+code+" and signal "+signal);
  });
}

process.on('exit', function(code) {
  return logger.error("About to exit with code "+code);
});