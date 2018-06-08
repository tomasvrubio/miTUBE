var mongoose = require('mongoose');

var listSchema = mongoose.Schema({
    name: String,
    url: String,
    dateUpdated: String,
    picture: String,
    songs: [String],
});

var list = mongoose.model('list', listSchema);
module.exports = list;