var mongoose = require('mongoose'),
WorkTodo = require('../models/workTodo.js'),
WorkDone = require('../models/workDone.js');

//Trabajo con canciones que está pendiente.
var workTodoSchema = mongoose.Schema({
	songId: String,
	listId: String,
	email: String, 
	state: String,
	dateLastMovement: Date,
});

var WorkTodo = mongoose.model('WorkTodo', workTodoSchema);
module.exports = WorkTodo;