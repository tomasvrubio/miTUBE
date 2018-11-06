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
    
    createUser: function (email, name, gmailUser, res, mailTransport) {
      return new Promise((resolve, reject) => {

        Promise.all([
          User.findOne({email}),
          User.aggregate([{$group: {_id: null, macMax: {$max: "$mac"}}}])
        ]).then( ([user, macData]) => {
      
          if (user){
            logger.debug("Allready registered user");
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
            cart.password = Math.random().toString(36).substring(5);
            logger.debug("Password for "+ email +" is: "+cart.password);
            newUser.password =  newUser.generateHash(cart.password);
            
            newUser.save(function(err) {
              if (err){
                logger.error("Can't save user in DB: "+JSON.stringify(err.stack));
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
              
              return resolve("OK");
            });
          }
        }).catch(err => {
          logger.error("Problems searching if exists User or max MAC: "+JSON.stringify(err.stack));
          return reject(err.stack);
        });


      });
    },

    authUser: function (params, gmailUser, res, mailTransport) {
      return new Promise((resolve, reject) => {
        if (params.value == "OK"){
          User.findOneAndUpdate(
            {email: params.email},
            {$set: {role: "basic"}}, function(err, user){
              logger.debug("User "+params.email+" given access.");
              //Mandar mail indicando que ya le han dado autorización
              var cart = {
                name: user.username,
                email: user.email,
              };
              res.render("email/email_auth", {layout: null, cart}, function(err,html){
                if(err) logger.error("Problems generating email: "+JSON.stringify(err.stack));
                mailTransport.sendMail({
                  from: '"mitube": '+gmailUser,
                  to: cart.email,
                  subject: "Acceso confirmado",
                  html: html,
                  generateTextFromHtml: true
                }, function(err){
                  if(err) logger.error("Unable to send email: "+JSON.stringify(err.stack));  
                });
              });
            }
          );
        } else {
          User.findOneAndUpdate(
            {email: params.email},
            {$set: {role: "rejected"}}, function(err){
              logger.debug("User "+params.email+" not allowed.");
            }
          );
        }

        return resolve();
      });
    },

  }
};