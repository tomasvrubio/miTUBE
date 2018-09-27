var process = require("child_process"),
    fs = require("fs"),
    logger = require('../lib/logger'); 

module.exports = function(){
    return {
        getAuth: function(email, mac, authCode) {
            return new Promise((resolve, reject) => {
                //No hace falta situar esa primera canción. Nos vale con que no exista.
                var child = process.spawn("gmupload", ["-U", mac, "-c", email, "-l", "cancion_prueba.mp3"]);
                var response = {};
                var urlAuth;

                child.stdout.on("data", function (data) {
                    var dataString = data.toString('utf8');
                    
                    if (dataString.includes("Visit the following url:")){
                        urlAuth = dataString.split(/\r?\n/)[2];
                        if (authCode == null){                            
                            response = {
                                code: 1,
                                message: "Usuario sin delegar acceso miTUBE a Google Music",
                                url: urlAuth,
                            };
                            child.kill("SIGKILL");
                        }
                        else{
                            child.stdin.write(authCode+"\n");
                        }
                    }        
                    //console.log("spawnSTDOUT:" + data);
                });
                  
                child.stderr.on("data", function (data) {
                    var dataString = data.toString('utf8');
                    
                    if (dataString.includes("invalid_grant")){
                        response = {
                            code: 2,
                            message: "Código autorización insertado incorrecto.",
                            url: urlAuth,
                        };
                    }

                    if (dataString.includes("authentication failed")){
                        response = {
                            code: 3,
                            message: "Usuario sin registrar en Google Music.",
                            url: urlAuth,
                        };
                    }

                    if (dataString.includes("authentication succeeded")){
                        response = {
                            code: 0,
                            message: "Autenticación correcta.",
                        };
                    }    
                    //console.log("spawnSTDERR:" + data);
                });
                
                child.on("exit", function (code) {
                    //console.log("spawnEXIT:", code);
                    return resolve(response);
                });  
            });
        },

        //upload: function(email, mac, songId) {
        upload: function(email, mac, songId) {
            return new Promise((resolve, reject) => {
                var child = process.spawn("gmupload", ["-U", mac, "-c", email, "-l", "./tmp/"+songId+".mp3"]);

                //TODO: Manejar el que no se pueda autenticar y entonces almacenarlo como un error.
                child.stdout.on("data", function (data) {    
                    console.log("spawnSTDOUT:" + data);
                });
                  
                child.stderr.on("data", function (data) {
                    console.log("spawnSTDERR:" + data);
                });
                
                child.on("exit", function (code) {
                    console.log("spawnEXIT:", code);
                    return resolve(code);
                    //Devuelve un 0 si todo ha ido bien. Y pinta:
                    //spawnSTDERR:(1/1) Successfully uploaded -- ./tmp/ZkCa2on8ia8.mp3 (07a9ee97-a1e1-3193-8ad7-f379eea3f88c)
                    //Devuelve un 0 si no ha tenido que hacer nada porque esa canción ya existe en la cuenta del usuario. Y pinta:
                    //spawnSTDERR:(1/1) Failed to upload -- ./tmp/ZkCa2on8ia8.mp3 (07a9ee97-a1e1-3193-8ad7-f379eea3f88c) | ALREADY EXISTS
                });                 
            

            });
        },
    }
};