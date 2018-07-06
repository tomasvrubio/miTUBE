var mongoose = require('mongoose');


var listSchema = mongoose.Schema({
    listId: String,
    nameYT: String, //Nombre de la lista en yt
    //dateUpdated: String, //REVISAR:Es necesario?
    //picture: String, //REVISAR:Esto tiene que ir en la relación de cada uno con la lista
    songs: [{
        songId: String, //Youtube ID
        originalName: String,
        name: String,
        artist: String,
        added: Date,
        //duration: String,
    }],
});

var list = mongoose.model('list', listSchema);
module.exports = list;