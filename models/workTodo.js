var mongoose = require('mongoose');

//Trabajo con canciones que está pendiente.
var workTodoSchema = mongoose.Schema({
	songId: String,
	listId: String,
	listName: String,
	email: String, 
	state: String,
	dateLastMovement: Date,
});

var WorkTodo = mongoose.model('WorkTodo', workTodoSchema);
module.exports = WorkTodo;