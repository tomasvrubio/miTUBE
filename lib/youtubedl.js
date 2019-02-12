var process = require("child_process"),
  logger = require('../lib/logger');

module.exports = function () {
  return {

    download: function (songId) {
      return new Promise((resolve, reject) => {

        var child = process.spawn("youtube-dl", ["--no-playlist", "--metadata-from-title", "%(artist)s - %(title)s", "--add-metadata", "--extract-audio", "--audio-format", "mp3", "--no-progress", "-o", "tmp/%(id)s.%(ext)s", "https://youtu.be/"+songId]);

        child.stdout.on("data", function (data) {
          var dataString = data.toString('utf8');

          logger.debug("spawnSTDOUT:" + JSON.stringify(dataString));
        });

        child.stderr.on("data", function (data) {
          var dataString = data.toString('utf8');
          
          logger.error("spawnSTDERR:" + JSON.stringify(dataString));
        });

        child.on("exit", function (code) {
          logger.info("spawnEXIT: "+ code);

          return resolve(code);
        });

      });
    },

    updateTool: function () {
      return new Promise((resolve, reject) => {

        var child = process.spawn("pip3", ["install", "--upgrade", "youtube-dl", "--user"]);

        child.stdout.on("data", function (data) {
          var dataString = data.toString('utf8');

          if (dataString.includes("Requirement already up-to-date")) {
            response = {
              code: 1,
            }
          } else if (dataString.includes("Successfully installed")){
            response = {
              code: 0,
            }
          }

          logger.debug("spawnSTDOUT:" + JSON.stringify(dataString));
        });

        child.stderr.on("data", function (data) {
          var dataString = data.toString('utf8');
          
          logger.error("spawnSTDERR:" + JSON.stringify(dataString));
        });

        child.on("exit", function (code) {
          logger.info("spawnEXIT: "+ code);

          return resolve(response);
        });

      });
    },

    changeMetadataAlbum: function (songId, listName) {
      return new Promise((resolve, reject) => {

        var child = process.spawn("mid3v2", ["-A", listName, "tmp/" + songId + ".mp3"]);

        child.stdout.on("data", function (data) {
          var dataString = data.toString('utf8');
          
          //logger.debug("spawnSTDOUT:" + JSON.stringify(dataString));
        });

        child.stderr.on("data", function (data) {
          var dataString = data.toString('utf8');
          
          //logger.error("spawnSTDERR:" + JSON.stringify(dataString));
        });

        child.on("exit", function (code) {
          //logger.info("spawnEXIT: "+ code);
          
          return resolve(code);
        });

      });
    },


    adjustAudio: function (songId) {
      return new Promise((resolve, reject) => {

        var child = process.spawn("mp3gain", ["-c", "-r", "tmp/" + songId + ".mp3"]);

        child.stdout.on("data", function (data) {
          var dataString = data.toString('utf8');
          
          //logger.debug("spawnSTDOUT:" + JSON.stringify(dataString));
        });

        child.stderr.on("data", function (data) {
          var dataString = data.toString('utf8');
          
          //logger.error("spawnSTDERR:" + JSON.stringify(dataString));
        });

        child.on("exit", function (code) {
          logger.info("Ajuste audio - spawnEXIT: "+ code);
          
          return resolve(code);
        });


      });
    },

  }
};