var mongoose = require('mongoose');

//Trabajo con canciones que está pendiente.
var workTodoSchema = mongoose.Schema({
	songId: String,
  gmusicId: String,
  imageId: String,
	listId: String,
	listName: String,
	email: String, 
	state: String,
  dateLastMovement: Date,
  tries: Integer, //To avoid infinite works
});

var WorkTodo = mongoose.model('WorkTodo', workTodoSchema);
module.exports = WorkTodo;