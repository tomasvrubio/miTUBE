var mongoose = require('mongoose');


var listSchema = mongoose.Schema({
    listId: String,
    nameYT: String, //Nombre de la lista en yt
    updated: Date, 
    //picture: String, //REVISAR:Esto tiene que ir en la relación de cada uno con la lista
    songs: [{
        songId: {type: String, unique: true}, //Youtube ID //Esto tengo que ver lo de que sea único ya que en YT si que puede ir una canción repetida en una lista.
        originalName: String,
        name: String,
        artist: String,
        added: Date,
        //duration: String,
    }],
});

var list = mongoose.model('list', listSchema);
module.exports = list;