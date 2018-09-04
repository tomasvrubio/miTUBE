var process = require("child_process"),
    fs = require("fs"); 

module.exports = function(){
    return {
        getAuth: function(email, mac, authCode) {
            return new Promise((resolve, reject) => {
                //Hay que situar la cancion de prueba para conseguir la auth con la primera sincronización. Luego acordarse de borrarla del perfil del usuario.
                var child = process.spawn("gmupload", ["-U", mac, "-c", email, "-l", "cancion_prueba.mp3"]);

                child.stdout.on("data", function (data) {
                    var data2 = data.toString('utf8');
                    
                    if (data2.includes("Visit the following url:")){
                        //Aqui tengo que diferenciar entre tener ya el codigo de auth y no tenerlo.

                        var urlAuth = data2.split(/\r?\n/)[2];
                        //console.log("URL autorización: " + urlAuth);
                    }
                    child.kill("SIGKILL");
                                    
                    console.log("spawnSTDOUT:" + data);
                    res.render('gmusic', context);    
                })
                  
                child.stderr.on("data", function (data) {
                console.log("spawnSTDERR:" + data)
                })
                
                child.on("exit", function (code) {
                console.log("spawnEXIT:", code)
                })  

                if (authCode == null)
                    console.log("Hay que crear credenciales. Devolveríamos la URL para conseguir el authCode.");
                else
                    console.log("Ya viene el authCode. Crear el token. Primero comprobar que no existe en el directorio.");

                child.kill("SIGKILL");
                return resolve("mensajeResultado");
            });
        }
    }
};