var process = require("child_process"),
    logger = require('../lib/logger');

module.exports = function(){
    return {
        download: function(songId) {
            return new Promise((resolve, reject) => {
                var child = process.spawn("youtube-dl", ["--no-playlist", "--metadata-from-title", "%(artist)s - %(title)s", "--add-metadata", "--extract-audio", "--audio-format", "mp3", "--no-progress", "-o", "tmp/%(id)s.%(ext)s", songId]);

                child.stdout.on("data", function (data) {
                    // console.log("spawnSTDOUT:" + data);
                });

                child.stderr.on("data", function (data) {
                    console.log("spawnSTDERR:" + data);
                });

                child.on("exit", function (code) {
                    // console.log("spawnEXIT:", code);
                    return resolve(code);
                }); 
            });
        },

        changeMetadataAlbum: function(songId, listName) {
            return new Promise((resolve, reject) => {
                var child = process.spawn("mid3v2", ["-A", listName, "tmp/"+songId+".mp3"]);

                child.stdout.on("data", function (data) {
                    // console.log("spawnSTDOUT:" + data);
                });

                child.stderr.on("data", function (data) {
                    console.log("spawnSTDERR:" + data);
                });

                child.on("exit", function (code) {
                    // console.log("spawnEXIT:", code);
                    return resolve(code);
                }); 
            });
        },

        //TODO: En caso de no poder descargar canciones porque se haya quedado desactualizada, lanzar una actualización del programa yt-downloader.
        updateTool: function(){
            return new Promise((resolve, reject) => {

            });
        },
    }
};