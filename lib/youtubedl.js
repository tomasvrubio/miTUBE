var process = require("child_process"),
    fs = require("fs"); 

module.exports = function(){
    return {
        download: function(songId) {
            return new Promise((resolve, reject) => {
                var child = process.spawn("youtube-dl", ["--no-playlist", "--metadata-from-title", "%(artist)s - %(title)s", "--add-metadata", "--extract-audio", "--audio-format", "mp3", "--no-progress", "-o", "tmp/%(id)s.%(ext)s", songId]);

                //youtube-dl --no-playlist --metadata-from-title "%(artist)s - %(title)s" --add-metadata --extract-audio --audio-format mp3 --no-progress -o "Descargas/%(id)s.%(ext)s" "IgY3z5VSDBg"

                child.stdout.on("data", function (data) {
                    console.log("spawnSTDOUT:" + data);
                });

                child.stderr.on("data", function (data) {
                    console.log("spawnSTDERR:" + data);
                });

                child.on("exit", function (code) {
                    console.log("spawnEXIT:", code);
                    //Si devuelve 0 es que ha podido descargar la canción. Si devuelve 1 es que ha habido algún error
                    return resolve(code);
                }); 
            });
        }
    }
};