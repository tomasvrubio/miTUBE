var process = require("child_process"),
    fs = require("fs"); 

module.exports = function(){
    return {
        getAuth: function(email, mac, authCode) {
            return new Promise((resolve, reject) => {
                //Hay que situar la cancion de prueba para conseguir la auth con la primera sincronización. Luego acordarse de borrarla del perfil del usuario.
                var child = process.spawn("gmupload", ["-U", mac, "-c", email, "-l", "cancion_prueba.mp3"]);
                var response = null;

                child.stdout.on("data", function (data) {
                    var dataString = data.toString('utf8');
                    
                    if (dataString.includes("Visit the following url:")){
                        //Aqui tengo que diferenciar entre tener ya el codigo de auth y no tenerlo.
                        if (authCode == null){
                            console.log("Hay que crear credenciales. Devolveríamos la URL para conseguir el authCode.");
                            var urlAuth = dataString.split(/\r?\n/)[2];
                            //console.log("URL autorización: " + urlAuth); 
                            child.kill("SIGKILL");
                            //return resolve(urlAuth);
                            response = urlAuth;
                        }
                        else{
                            console.log("Ya viene el authCode. Crear el token. Primero comprobar que no existe en el directorio.");
                            child.stdin.write(authCode+"\n");
                            //return resolve(null);
                        }
                    }
                                    
                    console.log("spawnSTDOUT:" + data);
                })
                  
                child.stderr.on("data", function (data) {
                    console.log("spawnSTDERR:" + data)
                })
                
                child.on("exit", function (code) {
                    //Si code=1 de momento es que no ha funcionado bien. Cuando le hago un SIGKILL veo que viene a 0.
                    console.log("spawnEXIT:", code);
                    return resolve(response);
                })  
            });
        }
    }
};