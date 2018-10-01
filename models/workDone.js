var mongoose = require('mongoose');

//Trabajo con canciones ya realizado.
var workDoneSchema = mongoose.Schema({
	songId: String,
	listId: String,
	email: String,
	action: String,
	dateLastMovement: Date,
});

var WorkDone = mongoose.model('WorkDone', workDoneSchema);
module.exports = WorkDone;