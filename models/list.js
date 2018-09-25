var mongoose = require('mongoose');


var listSchema = mongoose.Schema({
    listId: String,
    nameYT: String, //Nombre de la lista en yt
    etag: String,
    updated: Date,
    songs: [{
        songId: {type: String}, 
        originalName: String,
        name: String,
        artist: String,
        added: Date,
        //duration: String,
    }],
});

var list = mongoose.model('list', listSchema);
module.exports = list;