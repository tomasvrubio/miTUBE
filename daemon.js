var nodemailer = require('nodemailer')
    mongoose = require('mongoose'),
    fs = require('fs');
    credentials = require('./credentials.js');

var WorkTodo = require('./models/workTodo.js'),
    WorkDone = require('./models/workDone.js'),
    User = require('./models/user.js');

var Gmusic = require('./lib/gmusic.js')(),
    YoutubeDL = require('./lib/youtubedl.js')();

//Database 
mongoose.connect(credentials.mongo.connectionString);

var active = 1; //To mantain de loop alive

//Promise to sleep the loop when its not necesary
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

//Declaration of the loop in async mode so we can call "await" inside to wait for promise end.
async function loop() {
  do {
    console.log("\n\nSoy el demonio encargado de trabajar.");
    await Promise.all([
      WorkTodo.find({state:"upl"}),
      User.find({},{"_id":0, "email":1, "mac":1})
    ]).then(async ([uploads, users]) => {  
    
      userMacs = Object.assign({}, ...users.map(person => ({[person.email]: person.mac})));
      console.log(uploads);
      console.log(userMacs);

      if (uploads.length==0)
        console.log("Sin subidas que realizar.");
      else{
        console.log("Hay que subir: ");
        for (const work of uploads){  
          if (fs.existsSync("./tmp/"+work.songId+".mp3")){
            console.log("Existe el archivo para la canción " + work.songId);
            //Cambiamos metadatos
            await YoutubeDL.changeMetadataAlbum(work.songId, "pruebando").then(returnObject => {
              console.log("Metadato cambiado.");
            }).catch(err => {
              console.error(err.stack);
            });
            
            //Subimos canción. TODO: ¿Mejor hacerlo con un then tras el cambio de metadata, no?
            await Gmusic.upload(work.email, userMacs[work.email], work.songId).then(returnObject => {
              console.log("He terminado de subir la canción. Y me han devuelto: ");
              console.log(returnObject);

              if (returnObject == 0){
                console.log("Canción subida.");
                //Guardo trabajo hecho en DONE.
                WorkDone.insertMany({
                  songId: work.songId,
                  listId: work.listId,
                  email: work.email,
                  dateLastMovement: Date.now()
                });

                work.remove();
                //Ahora compruebo si hay algún trabajo más de esa canción. En caso de que no haya la elimino.
                var sameSong = uploads.filter(obj => { return obj.songId == work.songId});
                console.log(sameSong);
                //TODO: Conseguir diferenciar que hay más trabajos pendientes.
                // if (sameSong.length() == 0){
                //   console.log("Tenemos que eliminar "+work.songId);
                //   //TODO: Eliminar mp3.
                // }
              }
            }).catch(err => {
              console.error(err.stack);
            });
          }
          else{
            console.log("No hay archivo para la canción " + work.songId);
            work.state = "err";
            work.dateLastMovement = Date.now();
            work.save();
          }
        }
      }

      //¿Y si esto lo encadeno con un then a la función anterior??? O al menos meterlo en sus {}
      await WorkTodo.findOne({state:"new"}).then(async function(work){ 
        if (work.length==0) {
          console.log("No hay descargas que realizar. Dormir durante X segundos.");
          //await sleep(2000); //TODO: Tras las pruebas descomentar y pensar cuantos segundos lo quiero parado.
        } 
        else {
          console.log("Hay que bajar la siguiente canción:");
          console.log(work);


          await YoutubeDL.download(work.songId).then(returnObject => {
            if (returnObject == 0) {
              console.log("Canción descargada.");
              WorkTodo.updateMany(
                {songId:work.songId, state:"new"},
                {$set: { state:"upl", dateLastMovement:Date.now() }}, function(err, newwork){
                  console.log("Canciones marcadas como upl");
                  console.log(newwork);
                }
              );
            }
            else if (returnObject == 1){
              console.log("No se ha podido descargar la canción.");
              //Paso las canciones a "err" para que no las esté reintentando??? Luego desde una web de administración podría hacer que todas rearrancasen.
              //Para este caso debería ver si hay una nueva versión del programa. //En caso de que no lo hubiese, como puedo estar fallando durante horas, debería dormir el programa unos cuantos minutos. ¿Y me podría avisar?
              WorkTodo.updateMany(
                {songId:work.songId, state:"new"},
                {$set: { state:"err", dateLastMovement:Date.now() }}, function(err, newwork){
                  console.log("Canciones marcadas como err");
                  console.log(newwork);
                }
              );  
            }
          }).catch(err => {
            console.error(err.stack);
          });           
        }
      });
    });

    //  SI HUBIESE ALGÚN ERROR DEMASIADO GRAVE SALIR DEL BUCLE Y FINALIZAR DEMONIO?
    
    await sleep(2000); //TODO: Borrar tras pruebas.
  } while (active);
}

//Run the loop
loop();