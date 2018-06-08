var mongoose = require('mongoose');

var listUserSchema = mongoose.Schema({
	user: String,
	name: String,
	created: Date,
});

var ListUser = mongoose.model('ListUser', listUserSchema);
module.exports = ListUser;