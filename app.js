var express = require('express');
const favicon = require('express-favicon');
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

//Utilizamos un fichero con las credenciales. Importante que no sincronice con el repositorio.
var credentials = require('./credentials.js');

//Email sender
var nodemailer = require('nodemailer');
var mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: credentials.gmail.user,
    pass: credentials.gmail.password,
  }
});

app.use(favicon(__dirname + '/public/favicon.png'));
app.use(express.static(__dirname + '/public'));
app.use(require('body-parser')()); //Para poder usar variables de formulario en req.body
app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')());

//Flash messages - FUNCIONALIDAD SIN USAR (CAP9 - Using Sessions to Implement Flash Messages)
app.use(function(req, res, next){
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

//--------------Routing
app.get('/', function(req, res){
  var context = { name: req.session.userName || "Anonymous",
                  csrf: 'CSRF token goes here'};
  res.render('home', context);
});

app.post('/process-home', function(req, res){
  req.session.userName = req.body.name;
  res.redirect(303, '/');
});

app.get('/register', function(req, res){
  res.render('register', { csrf: 'CSRF token goes here' });
});

// app.post('/process-register', function(req, res){
//   //Para ver datos del formulario que he recibido del usuario
//   console.log('Form (from querystring): ' + req.query.form);
//   console.log('CSRF token (from hidden form field): ' + req.body._csrf);
//   console.log('Name (from visible form field): ' + req.body.name);
//   res.redirect(303, '/');
// });

app.post('/process-register', function(req, res){
  console.log('Name (from visible form field): ' + req.body.name);
  //var cart = req.session.cart;
  var cart = "";
  var name = req.body.name || '', email = req.body.email || '';
  // input validation
  //if(!email.match(VALID_EMAIL_REGEX))
  //        return res.next(new Error('Invalid email address.'));
  // assign a random cart ID; normally we would use a database ID here
  //cart.number = Math.random().toString().replace(/^0\.0*/, '');
   cart = {
           name: name,
           email: email,
   };
   console.log('Nombre: ' + cart.name + 'y Email: ' + cart.email);
  // res.render('email/email_lite',
  //   { layout: null, cart: cart }, function(err,html){
  //           if( err ) console.log('error in email template');
  //           mailTransport.sendMail({
  //               from: '"miTUBE": desarrollovazquezrubio@gmail.com',
  //               to: email,
  //               subject: 'Here is your login information',
  //               html: html,
  //               generateTextFromHtml: true
  //           }, function(err){
  //                   if(err) console.error('Unable to send confirmation: '
  //                           + err.stack);
  //           });
  //       }
  // );
  res.redirect(303, '/');
});

app.get('/about', function(req, res){
  res.render('about');
});

app.get('/user', function(req, res){
  res.render('user');
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