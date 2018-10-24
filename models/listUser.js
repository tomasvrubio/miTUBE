var mongoose = require('mongoose');


//Puede haber tantos objetos de este tipo como listas haya entre todos los usuarios. Una url puede estar repetida entre varios usuarios. Un nombre puede estar repetido entre varios usuarios. Un usuario no puede tener ni la misma url ni el mismo nombre. 
var listUserSchema = mongoose.Schema({
	email: String,
	name: String,
	listId: String, //Youtube ID
	created: Date,
	updated: Date,
	sync: {type:Boolean, default:true},
	picture: String, //REVISAR:¿Seguro que es un string? //TODO: Creo que no me va a hacer falta porque de momento no veo manera de subirla a Google.
	//Pensando en poner un campo más que indique que hay trabajo pendiente a la hora de descargar, sincronizar canciones. Podría ser un booleano.
});

var ListUser = mongoose.model('ListUser', listUserSchema);
module.exports = ListUser;