var User = require('../models/user.js'),
    logger = require('../lib/logger');

module.exports = function () {
 
  function blaInternal() {

  }

  function sendMail(email, mailFile, mailSubject) {
    //logic to send a mail to the user
  }

  return {
    
    blaExternal: function () {
      //console.log("Consigo info sobre las canciones de la lista");
      return new Promise((resolve, reject) => {
       
      });
    },

    createUser: function (email, name) {
      //console.log("Consigo info sobre las canciones de la lista");
      
      return new Promise((resolve, reject) => {
        Promise.all([
          User.findOne({email}),
          User.aggregate([{$group: {_id: null, macMax: {$max: "$mac"}}}])
        ]).then( ([user, macData]) => {
      
          if (user){
            logger.debug("Allready registered user");
            req.flash("info", "Usuario ya registrado previamente. Utilice otro email");
            return res.redirect(303, "/register");
      
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
              res.render("email/email_register", {layout: null, cart}, function(err,html){
                if(err) logger.error("Problems generating email: "+JSON.stringify(err.stack));
                mailTransport.sendMail({
                  from: '"mitube": '+credentials.gmail.user,
                  to: cart.email,
                  subject: "Usuario dado de alta",
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
          return res.redirect(303, "/register");
        });


      });
    },

  }
};