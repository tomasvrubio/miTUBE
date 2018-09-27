var nodemailer = require('nodemailer')
    mongoose = require('mongoose'),
    fs = require('fs');
    credentials = require('./credentials.js');

var WorkTodo = require('./models/workTodo.js'),
    WorkDone = require('./models/workDone.js'),
    User = require('./models/user.js');

var Gmusic = require('./lib/gmusic.js')(),
    YoutubeDL = require('./lib/youtubedl.js')(),
    logger = require('./lib/logger');

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
    logger.info("Another iteration of the Daemon.");
    await Promise.all([
      WorkTodo.find({state:"upl"}),
      User.find({},{"_id":0, "email":1, "mac":1})
    ]).then(async ([uploads, users]) => {  
    
      userMacs = Object.assign({}, ...users.map(person => ({[person.email]: person.mac})));
      console.log(uploads);
      console.log(userMacs);

      if (uploads.length==0)
        logger.debug("Nothing to upload.");
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
            
            console.log("Subiendo canción "+work.songId+"para el usuario "+work.email);
            //Subimos canción. TODO: ¿Mejor hacerlo con un then tras el cambio de metadata, no?
            await Gmusic.upload(work.email, userMacs[work.email], work.songId).then(returnObject => {
              console.log("He terminado de subir la canción. Y me han devuelto: ");
              console.log(returnObject);

              if (returnObject == 0){
                console.log("Canción subida.");

                WorkDone.insertMany({
                  songId: work.songId,
                  listId: work.listId,
                  email: work.email,
                  dateLastMovement: Date.now()
                });

                WorkTodo.find({songId: work.songId, state:"upl"}).countDocuments().then(uplWork => {
                  logger.debug('Pending uploads of '+work.songId+': '+uplWork);
                  if (uplWork == 1){
                    fs.unlink("./tmp/"+work.songId+".mp3", function (err) {
                        if (err) throw err;
                        logger.debug('File '+work.songId+' deleted');
                    }); 
                  }
                });
                
                work.remove();
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
        if (work==null) {
          logger.debug("Nothing to download. Sleeping...");
          await sleep(10000); //TODO: Ajustar tiempo dormido. ¿2 minutos?
        } 
        else {
          logger.debug("Need to download "+work.songId);

          await YoutubeDL.download(work.songId).then(returnObject => {
            if (returnObject == 0) {
              logger.debug("Song "+work.songId+" downloaded");
              WorkTodo.updateMany(
                {songId:work.songId, state:"new"},
                {$set: { state:"upl", dateLastMovement:Date.now() }}, function(err){
                  logger.debug("Works of "+work.songId+" with 'new' state moved to 'upl' state.");
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
          
          await sleep(1000);
        }
      });
    });

    //  SI HUBIESE ALGÚN ERROR DEMASIADO GRAVE SALIR DEL BUCLE Y FINALIZAR DEMONIO?
  } while (active);
}

//Run the loop
loop();