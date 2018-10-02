var process = require("child_process"),
    logger = require('../lib/logger'); 

module.exports = function(){
    return {
        getAuth: function(email, mac, authCode) {
            return new Promise((resolve, reject) => {
                //It's not necesary to have this song, it's only a parameter to launch command
                var child = process.spawn("gmupload", ["-U", mac, "-c", email, "-l", "fake_song.mp3"]);
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
                    // console.log("spawnSTDOUT:" + data);
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
                    // console.log("spawnSTDERR:" + data);
                });
                
                child.on("exit", function (code) {
                    if (code==1) return reject(code);
                    // console.log("spawnEXIT:", code);
                    return resolve(response);
                });  
            });
        },

        upload: function(email, mac, songId) {
            return new Promise((resolve, reject) => {
                var child = process.spawn("gmupload", ["-U", mac, "-c", email, "-l", "./tmp/"+songId+".mp3"]);
                var response = {};

                //TODO: Manejar el que no se pueda autenticar y entonces almacenarlo como un error.
                child.stdout.on("data", function (data) {    
                    console.log("spawnSTDOUT:" + data);
                });
                  
                child.stderr.on("data", function (data) {
                    var dataString = data.toString('utf8');

                    if (dataString.includes("Successfully uploaded") || dataString.includes("ALREADY EXISTS")){
                        response = {
                            code: 0,
                            uuid: dataString.match(/\(.*?\)/g)[1].match(/\(([^)]+)\)/)[1], //Return uuid
                        };
                    };

                    console.log("spawnSTDERR:" + data);
                });
                
                child.on("exit", function (code) {
                    if (code==1) return reject(code);
                    return resolve(response);
                });          
            });
        },

        delete: function(email, password, mac, gmusicId) {
            return new Promise((resolve, reject) => {
                var child = process.spawn("gmdelete", ["-U", mac, "-u", email, "-p", password, "-d", "-f",  "id:"+gmusicId]);
                //Lo malo es que para utilizar este proceso tengo que informar de la password del usuario con -p

                child.stdout.on("data", function (data) {    
                    console.log("spawnSTDOUT:" + data);
                });
                  
                child.stderr.on("data", function (data) {
                    console.log("spawnSTDERR:" + data);
                });
                
                child.on("exit", function (code) {
                    if (code==1) return reject(code);
                    console.log("spawnEXIT:", code);
                    return resolve(code);
                });
            });
        },
    }
};