var User = require('../models/user.js'),
    logger = require('../lib/logger');

module.exports = function () {
 
  function blaInternal() {

  }

  function sendMail(email, mailFile, mailSubject) {
    //logic to send a mail to the user
  }

  function assignMac (macMax) {
    if (macMax){
      //Continue to the next number to create MAC 
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
      //Create the first MAC of mitube
      var newMacArray = [
        "b8", "27", "eb", 
        Math.floor(Math.random()*255).toString(16), 
        Math.floor(Math.random()*240).toString(16),
        "00"
      ];
    }

    return (newMacArray.join(":"));
  }

  return {
    
    blaExternal: function () {
      //console.log("Consigo info sobre las canciones de la lista");
      return new Promise((resolve, reject) => {
       
      });
    },

    createUser: function (email, name, gmailUser, res, mailTransport) {
      return new Promise((resolve, reject) => {

        Promise.all([
          User.findOne({email}),
          User.aggregate([{$group: {_id: null, macMax: {$max: "$mac"}}}])
        ]).then( ([user, macData]) => {
      
          if (user){
            logger.debug("Allready registered user");
            // req.flash("info", "Usuario ya registrado previamente. Utilice otro email");
            return resolve("KO");
      
          } else {
            var cart = {
              name: name,
              email: email,
            };

            //Generate MAC
            var macMax = macData[0].macMax;
            logger.debug("Actual max MAC is: "+macMax);

            //First user is Admin
            if (!macMax)  var newRole = "admin";            
            
            var newMac = assignMac(macMax);
            logger.debug("New MAC is: "+newMac);
      
            var newUser = new User({
              username: name,
              email: email,
              mac: newMac,
              created: Date.now(),
              role: newRole || "disabled", 
            });

            //Generate password
            cart.password = Math.random().toString().replace(/^0\.0*/, '');
            logger.debug("Password for "+ email +" is: "+cart.password);
            newUser.password =  newUser.generateHash(cart.password);
            
            newUser.save(function(err) {
              if (err){
                logger.error("Can't save user in DB: "+JSON.stringify(err.stack));
                // req.flash("info", "Ha ocurrido un error técnico");

                return reject(err.stack);
              }
              logger.debug("User saved to DB");

              
              //TODO: Revisar en que caso se mandan mails y no permitir acceder a los usuarios que aún no han sido autorizados. 
              res.render("email/email_register", {layout: null, cart}, function(err,html){
                if(err) logger.error("Problems generating email: "+JSON.stringify(err.stack));
                mailTransport.sendMail({
                  from: '"mitube": '+gmailUser,
                  to: cart.email,
                  subject: "Usuario dado de alta",
                  html: html,
                  generateTextFromHtml: true
                }, function(err){
                  if(err) logger.error("Unable to send email: "+JSON.stringify(err.stack));  
                });
              });
              
        
              // req.flash("info", "Usuario dado de alta. Debe esperar a que el administrador autorice su acceso. Recibirá un email de confirmación");

              return resolve("OK");
            });
          }
        }).catch(err => {
          logger.error("Problems searching if exists User or max MAC: "+JSON.stringify(err.stack));
          // req.flash("info", "Error. Reintentar registro");

          return reject(err.stack);
        });


      });
    },

  }
};