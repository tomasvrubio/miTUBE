var process = require("child_process"),
    fs = require("fs"); 

module.exports = function(){
    return {
        getAuth: function(email, mac, authCode) {
            return new Promise((resolve, reject) => {
                //No hace falta situar esa primera canción. Nos vale con que no exista.
                var child = process.spawn("gmupload", ["-U", mac, "-c", email, "-l", "cancion_prueba.mp3"]);
                var response = {};

                child.stdout.on("data", function (data) {
                    var dataString = data.toString('utf8');
                    
                    if (dataString.includes("Visit the following url:")){
                        //Aqui tengo que diferenciar entre tener ya el codigo de auth y no tenerlo.
                        if (authCode == null){
                            var urlAuth = dataString.split(/\r?\n/)[2];
                            response = {
                                code: 1,
                                message: urlAuth,
                            };
                            child.kill("SIGKILL");
                        }
                        else{
                            child.stdin.write(authCode+"\n");
                        }
                    }        
                    //console.log("spawnSTDOUT:" + data);
                })
                  
                child.stderr.on("data", function (data) {
                    var dataString = data.toString('utf8');
                    
                    if (dataString.includes("invalid_grant")){
                        response = {
                            code: 2,
                            message: "Código insertado incorrecto.",
                        };
                    }

                    if (dataString.includes("authentication failed")){
                        response = {
                            code: 2,
                            message: "Usuario sin registrar en Google Music.",
                        };
                    }

                    if (dataString.includes("authentication succeeded")){
                        response = {
                            code: 0,
                            message: "Autenticación correcta.",
                        };
                    }    
                    //console.log("spawnSTDERR:" + data);
                })
                
                child.on("exit", function (code) {
                    //console.log("spawnEXIT:", code);
                    return resolve(response);
                })  
            });
        }
    }
};