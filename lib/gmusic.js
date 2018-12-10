var process = require("child_process"),
  logger = require('../lib/logger');

//Hay que migrarlo todo a la nueva libreria: google-music-scripts

module.exports = function () {
  return {
    getAuth: function (action, email, mac, authCode) {
      return new Promise((resolve, reject) => {
        //It's not necesary to have this song, it's only a parameter to launch command
        if (action == "upl") {
          var child = process.spawn("gms", ["upload", "--uploader-id", mac, "-u", email, "-l", "fake_song.mp3"]);
        } else if (action == "del") {
          var child = process.spawn("gms", ["delete", "--device-id", mac, "-u", email, "-f", "id[fake_song]", "-y"]);
        }

        var response = {};
        var urlAuth;

        child.stdout.on("data", function (data) {
          var dataString = data.toString('utf8');

          if (dataString.includes("Visit:")) {
            urlAuth = dataString.split(/\r?\n/)[2];
            if (authCode == null) {
              response = {
                code: 1,
                message: "Usuario sin delegar acceso miTUBE a Google Music",
                url: urlAuth,
              };
              child.kill("SIGKILL");
            } else {
              child.stdin.write(authCode + "\n");
            }
          }
          console.log("spawnSTDOUT:" + data);
        });

        child.stderr.on("data", function (data) {
          var dataString = data.toString('utf8');

          if (dataString.includes("invalid_grant")) {
            response = {
              code: 2,
              message: "Código autorización insertado incorrecto.",
              url: urlAuth,
            };
          }

          if (dataString.includes("authentication failed")) {
            response = {
              code: 3,
              message: "Usuario sin registrar en Google Music. Abrir https://play.google.com/music",
              url: urlAuth,
            };
          }

          if (dataString.includes("Loading local songs") || dataString.includes("Filtering songs")) {
            response = {
              code: 0,
              message: "Autenticación correcta.",
            };
          }
          console.log("spawnSTDERR:" + data);
        });

        child.on("exit", function (code) {
          console.log("spawnEXIT:", code);                

          return resolve(response);
        });
      });
    },

    upload: function (email, mac, songId) {
      return new Promise((resolve, reject) => {
        //Return:
        //  * reject if there is a problem
        //  * code=0 : Song deleted or no song to delete
        //  * code=1 : Don't have permissions to user's googleMusic  

        var child = process.spawn("gms", ["upload", "--uploader-id", mac, "-u", email, "-l", "./tmp/" + songId + ".mp3"]);
        var response = {};

        //TODO: Manejar el que no se pueda autenticar y entonces almacenarlo como un error.
        child.stdout.on("data", function (data) {
          var dataString = data.toString('utf8');

          if (dataString.includes("Visit:")) {
            urlAuth = dataString.split(/\r?\n/)[2];
            
            response = {
              code: 1,
              message: "Usuario sin delegar acceso miTUBE a Google Music",
              url: urlAuth,
            };

            child.kill("SIGKILL");
          }

          console.log("spawnSTDOUT:" + data);
        });

        child.stderr.on("data", function (data) {
          var dataString = data.toString('utf8');

          if (dataString.includes("Uploaded") || dataString.includes("ALREADY EXISTS")) {
            response = {
              code: 0,
              uuid: dataString.match(/\(.*?\)/g)[1].match(/\(([^)]+)\)/)[1],   //Return uuid
              //TODO: Revisar si sigue devolviendo correctamente el uuid tras subir una canción.
            };
          };

          console.log("spawnSTDERR:" + data);
        });

        child.on("exit", function (code) {
          if (code == 1) return reject(code);
          return resolve(response);
        });
      });
    },

    delete: function (email, mac, gmusicId) {
      return new Promise((resolve, reject) => {
        //Return:
        //  * reject if there is a problem
        //  * code=0 : Song deleted or no song to delete
        //  * code=1 : Don't have permissions to user's googleMusic

        var child = process.spawn("gms", ["delete", "-u", email, "--device-id", mac, "-f", "id["+gmusicId+"]", "-y"]);
        var response = {};

        child.stdout.on("data", function (data) {
          var dataString = data.toString('utf8');

          if (dataString.includes("Visit:")) {
            urlAuth = dataString.split(/\r?\n/)[2];
            
            response = {
              code: 1,
              message: "Usuario sin delegar acceso miTUBE a Google Music",
              url: urlAuth,
            };

            child.kill("SIGKILL");
          }

          console.log("spawnSTDOUT:" + data);
        });

        child.stderr.on("data", function (data) {
          var dataString = data.toString('utf8');

          if (dataString.includes("Deleted") || dataString.includes("No songs to delete")) {
            response = {
              code: 0,
            };
          };

          console.log("spawnSTDERR:" + data);
        });

        child.on("exit", function (code) {
          //if (code == 1) return reject(code);
          console.log("spawnEXIT:", code);

          return resolve(response);
        });
      });
    },

  }
};