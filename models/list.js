var mongoose = require('mongoose');


var listSchema = mongoose.Schema({
    listId: String,
    nameYT: String, //Nombre de la lista en yt
    //dateUpdated: String, //REVISAR:Es necesario? Yo creo que si, que podría poner la última modificación que hemos tenido y así no tener que mirar en el array de songs.
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