var mongoose = require('mongoose');
var passportLocalMongoose = require("passport-local-mongoose")

var userSchema = mongoose.Schema({
	authId: String,
	username: String,
	password: String,
	email: String,
	role: String,
	created: Date,
});

//Para conectar la tabla de usuarios con la autenticación de Passport
userSchema.plugin(passportLocalMongoose);  

var User = mongoose.model('User', userSchema);
module.exports = User;
