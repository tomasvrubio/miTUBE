var User = require('../models/user.js'),
    logger = require('../lib/logger');

module.exports = function () {
 
  function sendMail(mailTransport, gmailUser, res, receiver, cart, action, title) {
    //logic to send a mail to the user

    res.render("email/email_"+action, {layout: null, cart}, function(err,html){
      if(err) logger.error("Problems generating email: "+JSON.stringify(err.stack));
      mailTransport.sendMail({
        from: '"mitube": '+gmailUser,
        to: receiver,
        subject: title,
        html: html,
        generateTextFromHtml: true
      }, function(err){
        if(err) logger.error("Unable to send email: "+JSON.stringify(err.stack));  
      });
    });

    return;
  }

  function assignMac (macMax) {
    if (macMax){
      //Continue to the next number to create MAC 
      var newMacArray = macMax.split(":");
      var incrementalNumber = parseInt(newMacArray[5],16);
      if (incrementalNumber<255){
        newMacArray[5] = (incrementalNumber+1).toString(16).toUpperCase().padStart(2,"0");
      }
      else{
        incrementalNumber = parseInt(newMacArray[4],16);
        newMacArray[4] = (incrementalNumber+1).toString(16).toUpperCase().padStart(2,"0");
        newMacArray[5] = "00";
      }        
    } else {
      //Create the first MAC of mitube
      var newMacArray = [
        "B8", "27", "EB", 
        Math.floor(Math.random()*255).toString(16).toUpperCase().padStart(2,"0"), 
        Math.floor(Math.random()*240).toString(16).toUpperCase().padStart(2,"0"),
        "00"
      ];
    }

    return (newMacArray.join(":"));
  }

  return {

    // pruebaEmail: function (email, name, gmailUser, res, mailTransport) {
    //   return new Promise((resolve, reject) => {
     
    //     var cart = {
    //       name: name,
    //       email: email,
    //     };

    //     sendMail(mailTransport, gmailUser, res, cart.email, cart, "register", "Prueba para ver imagen");

    //   });
    // },
    
    createFirstUser: function (email, name, gmailUser, res, mailTransport) {
      return new Promise((resolve, reject) => {

        var cart = {
          name: name,
          email: email,
        };

        var newRole = "admin";  
        var newMac = assignMac();

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
          
          sendMail(mailTransport, gmailUser, res, cart.email, cart, "register", "Admin dado de alta");
          
          return resolve("OK");
        });
     });
    },

    createUser: function (email, name, gmailUser, res, mailTransport) {
      return new Promise((resolve, reject) => {

        Promise.all([
          User.findOne({email}),
          User.aggregate([{$group: {_id: null, macMax: {$max: "$mac"}}}]),
          User.findOne({role:"admin"}),
        ]).then( ([user, macData, adminUser]) => {
      
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

              sendMail(mailTransport, gmailUser, res, cart.email, cart, "register", "Usuario dado de alta");
              
              sendMail(mailTransport, gmailUser, res, adminUser.email, cart, "alertAdmin", cart.email+" registrado");
              
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

              sendMail(mailTransport, gmailUser, res, cart.email, cart, "auth", "Acceso confirmado");
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