var mongoose = require('mongoose'),
	bcrypt = require('bcrypt-nodejs');
var passportLocalMongoose = require("passport-local-mongoose")

var userSchema = mongoose.Schema({
	authId: String,
	username: String,
	password: String,
	email: String,
	role: String,
	created: Date,
});

//Hay que implementar el validPassword. ¿Pero puedo utilizar el plugin de abajo sin mas?
// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};


//Para conectar la tabla de usuarios con la autenticación de Passport
//userSchema.plugin(passportLocalMongoose);  

var User = mongoose.model('User', userSchema);
module.exports = User;