var process = require("child_process"),
    logger = require('../lib/logger');


module.exports = function () {
  return {
    getAuth: function (action, email, mac, authCode) {
      return new Promise((resolve, reject) => {
        //It's not necesary to have this song, it's only a parameter to launch command
        if (action == "upl") {
          // var child = process.spawn("gms", ["upload", "--uploader-id", mac, "-u", email, "-l", "fake_song.mp3"]);
          var child = process.spawn("gms", ["upload", "--uploader-id", mac, "-u", email, "fake_song.mp3"]);
        } else if (action == "del") {
          var child = process.spawn("gms", ["delete", "--device-id", mac, "-u", email, "-f", "id[fake_song]", "-y"]);
        }

        // logger.debug(JSON.stringify(child))

        var response = {};
        var urlAuth;

        //TODO: ¿Qué mensaje me devuelve si no tengo un método de pago asignado?

        child.stdout.on("data", function (data) {
          var dataString = data.toString('utf8');

          if (dataString.includes("Visit:")) {
            urlAuth = dataString.split(/\r?\n/)[2];
            if (authCode == null) {
              response = {
                code: 1,
                message: "Usuario sin delegar acceso mitube a Google Music",
                url: urlAuth,
              };
              child.kill("SIGKILL");
            } else {
              child.stdin.write(authCode + "\n");
            }
          }

          if (dataString.includes("Loading local songs") || dataString.includes("Filtering songs")) {
            response = {
              code: 0,
              message: "Autenticación correcta.",
            };
          }

          logger.debug("spawnSTDOUT:" + JSON.stringify(dataString));
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
          logger.error("spawnSTDERR:" + JSON.stringify(dataString));
        });

        child.on("exit", function (code) {
          logger.info("spawnEXIT: "+ code);

          return resolve(response);
        });
      });
    },

    upload: function (email, mac, songId, imageId) {
      return new Promise((resolve, reject) => {
        //Return:
        //  * reject if there is a problem
        //  * code=0 : Song deleted or no song to delete
        //  * code=1 : Don't have permissions to user's googleMusic  
        var child = process.spawn("gms", ["upload", "--uploader-id", mac, "-u", email, "./tmp/" + songId + ".mp3", "--album-art", "../public/" + imageId, "--no-use-hash", "-v"]);
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

          if (dataString.includes("Uploaded") || dataString.includes("Already exists") || dataString.includes("Matched")) {
            response = {
              code: 0,
              uuid: dataString.match(/\(.*?\)/g)[1].match(/\(([^)]+)\)/)[1],   //Return uuid
            };
          };

          logger.silly("spawnSTDOUT:" + JSON.stringify(dataString));
        });

        child.stderr.on("data", function (data) {
          var dataString = data.toString('utf8');

          if (dataString.includes("Uploaded") || dataString.includes("Already exists") || dataString.includes("Matched")) {
            response = {
              code: 0,
              uuid: dataString.match(/\(.*?\)/g)[1].match(/\(([^)]+)\)/)[1],   //Return uuid
            };
          };

          if (dataString.includes("Maximum allowed file size is")) {
            response = {
              code: 2,
              message: "Tamaño fichero canción mayor al permitido"
            };
            return resolve(response);
          };

          logger.silly("spawnSTDERR:" + JSON.stringify(dataString));
        });

        child.on("exit", function (code) {
          logger.silly("spawnEXIT: "+ code);

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

          if (dataString.includes("Deleted") || dataString.includes("No songs to delete")) {
            response = {
              code: 0,
            };
          };

          logger.silly("spawnSTDOUT:" + JSON.stringify(dataString));
        });

        child.stderr.on("data", function (data) {
          var dataString = data.toString('utf8');

          if (dataString.includes("Deleted") || dataString.includes("No songs to delete")) {
            response = {
              code: 0,
            };
          };

          logger.silly("spawnSTDERR:" + JSON.stringify(dataString));
        });

        child.on("exit", function (code) {
          //if (code == 1) return reject(code);
          logger.silly("spawnEXIT: "+ code);

          return resolve(response);
        });
      });
    },

  }
};