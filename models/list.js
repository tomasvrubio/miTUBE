var mongoose = require('mongoose');


var listSchema = mongoose.Schema({
    name: String,
    url: String,
    dateUpdated: String,
    picture: String,
    songs: [{
        songId: String, //Youtube ID
        originalName: String,
        name: String,
        artist: String,
        added: Date,
        duration: String,
    }],
});

var list = mongoose.model('list', listSchema);
module.exports = list;