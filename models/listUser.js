var mongoose = require('mongoose');

var listUserSchema = mongoose.Schema({
	email: String,
	name: String,
	created: Date,
});

var ListUser = mongoose.model('ListUser', listUserSchema);
module.exports = ListUser;