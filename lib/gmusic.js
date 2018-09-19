var process = require("child_process"),
    fs = require("fs"); 

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
        }
    }
};