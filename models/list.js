var mongoose = require('mongoose');


var listSchema = mongoose.Schema({
  listId: String,
  nameYT: String, //Nombre de la lista en yt
  etag: String,
  modified: Date,
  updated: Date, //¿Y si lo llamo checked?
  songs: [{
    songId: {
      type: String
    },
    originalName: String,
    name: String,
    artist: String,
    added: Date,
    gmusicId: String,
    //duration: String,
  }],
});

var list = mongoose.model('list', listSchema);
module.exports = list;