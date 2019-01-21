var nodemailer = require('nodemailer'),
    mongoose = require('mongoose'),
    fs = require('fs');
    credentials = require('./credentials.js');

var WorkTodo = require('./models/workTodo.js'),
    WorkDone = require('./models/workDone.js'),
    User = require('./models/user.js'),
    List = require('./models/list.js');

var Gmusic = require('./lib/gmusic.js')(),
    YoutubeDL = require('./lib/youtubedl.js')(),
    logger = require('./lib/logger');

mongoose.connect(credentials.mongo.connectionString);

var active = 1; //To mantain de loop alive

//Promise to sleep the loop when its not necesary
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

//Declaration of the loop in async mode so we can call "await" inside to wait for promise end.
async function loop() {
  do {
    logger.info("Daemon - Another iteration.");



    //Search for songs to delete
    //Aquí deberíamos buscar si hay trabajos para eliminar canciones. En caso de que los haya y tenga la pass del usuario lanzarlos. Si no ponerlos en estado err-del
    await Promise.all([
      WorkTodo.find({state:"del"}),
      User.find({},{"_id":0, "email":1, "mac":1})
    ]).then(async ([deletes, users]) => {  

      userMacs = Object.assign({}, ...users.map(person => ({[person.email]: person.mac})));

      if (deletes.length==0)
        logger.debug("Daemon - Nothing to delete.");
      else{
        logger.debug("Daemon - Songs to delete...");
        for (const work of deletes){  
            
            logger.debug("Daemon - Deleting "+work.songId+" song for "+work.email);

            if (!work.gmusicId){
              logger.debug("Daemon - No gmusicId (song not uploaded). Pending 'upl' work.");
            }
            //TODO: SI hubiese alguna tarea de upload con esta lista+canción debería borrarla. También eso significará que no hay datos de la canción. Lo puedo comprobar mirando si existe el gmusicId.
            // WorkTodo.find({email: work.email, listId: work.listId, songId:work.songId, state:"upl"}).then( uploadDeleted => {
            //   logger.debug("Daemon - Pending 'upl' work for this user and song removed.");
            //   WorkDone.insertMany({
            //     songId: uploadDeleted.songId,
            //     listId: uploadDeleted.listId,
            //     email: uploadDeleted.email,
            //     action: "upl",
            //     dateLastMovement: Date.now()
            //   });
            // });   

            //Elimino el trabajo de gmusic.
            await Gmusic.delete(work.email, userMacs[work.email], work.gmusicId).then(returnObject => {

              if (returnObject.code == 0){  //TODO: No tengo contemplado como manejar los errores a la hora de ejecutar el borrado.
                logger.debug("Daemon - Ended deleting song.");
                
                //Una vez terminado muevo el trabajo a workDone.          
                WorkDone.insertMany({
                  songId: work.songId,
                  listId: work.listId,
                  email: work.email,
                  action: "del",
                  dateLastMovement: Date.now()
                });                

                work.remove();
              } else if (returnObject == 1) {
                logger.debug("Daemon - Problems deleting. Move 'del' works to 'err-del'.");
                work.state = "err-del";
                work.dateLastMovement = Date.now();
                work.save();
              }

            }).catch(err => {
              logger.debug("Daemon - Delete exception.")
              logger.error(err.stack);
            });                        
        }
      }
    });



    //Search for songs to upload
    await Promise.all([
      WorkTodo.find({state:"upl"}),
      User.find({},{"_id":0, "email":1, "mac":1})
    ]).then(async ([uploads, users]) => {  
    
      userMacs = Object.assign({}, ...users.map(person => ({[person.email]: person.mac})));

      if (uploads.length==0)
        logger.debug("Daemon - Nothing to upload.");
      else{
        logger.debug("Daemon - Songs to upload...");
        for (const work of uploads){  
          if (fs.existsSync("./tmp/"+work.songId+".mp3")){
            
            await YoutubeDL.changeMetadataAlbum(work.songId, work.listName).then(returnObject => {
              logger.debug("Daemon - Album metadata changed to "+work.listName+" for song "+work.songId);
            }).catch(err => {
              logger.error(err.stack);
            });
            
            logger.debug("Daemon - Uploading song "+work.songId+" for user "+work.email);
            await Gmusic.upload(work.email, userMacs[work.email], work.songId, work.imageId).then(returnObject => {
              logger.debug("Daemon - Gmusic returns: "+JSON.stringify(returnObject));

              if (returnObject.code == 0){  //TODO: No tengo contemplado como manejar los errores a la hora de ejecutar la subida.
                logger.debug("Daemon - Ended uploading song.");

                List.findOneAndUpdate(
                  {listId:work.listId, "songs.songId":work.songId}, 
                  {"$set": { "songs.$.gmusicId":returnObject.uuid }}
                ).then(returnObject => {
                  logger.debug("Daemon - Uuid introduced into List.");
                });

                WorkDone.insertMany({
                  songId: work.songId,
                  listId: work.listId,
                  email: work.email,
                  action: "upl",
                  dateLastMovement: Date.now()
                });

                WorkTodo.find({songId: work.songId, state:"upl"}).countDocuments().then(uplWork => {
                  logger.debug("Daemon - Pending uploads of "+work.songId+": "+uplWork);
                  if (uplWork == 1){
                    fs.unlink("./tmp/"+work.songId+".mp3", function (err) {
                        if (err) throw err;
                        logger.debug("Daemon - File "+work.songId+" deleted");
                    }); 
                  }
                });
                
                work.remove();
              } else if (returnObject.code == 1){
                logger.debug("Daemon - Don't have auth to users Google Music. Move 'upl' work to 'err-upl'.");
                work.state = "err-upl";
                work.dateLastMovement = Date.now();
                work.save();
              }
            }).catch(err => {
              logger.error(err.stack);
            });
          }
          else{
            logger.error("Daemon - No file found for song "+work.songId);
            work.state = "err-upl";
            work.dateLastMovement = Date.now();
            work.save();
          }
        }
      }


      
      //Search for songs to download
      await WorkTodo.findOne({state:"new"}).then(async function(work){ 
        if (work==null) {
          logger.debug("Daemon - Nothing to download. Sleeping "+credentials.daemon.sleepTime+"ms ...");
          await sleep(credentials.daemon.sleepTime); //TODO: Adjust SLEEP TIME (ms)
        } 
        else {
          logger.debug("Daemon - Need to download "+work.songId);

          await YoutubeDL.download(work.songId).then(async function(returnObject){
            if (returnObject == 0) {
              logger.debug("Daemon - Song "+work.songId+" downloaded.");
              WorkTodo.updateMany(
                {songId:work.songId, state:"new"},
                {$set: { state:"upl", dateLastMovement:Date.now() }}, function(err){
                  logger.debug("Daemon - Works of "+work.songId+" with 'new' state moved to 'upl' state.");
                }
              );

              await YoutubeDL.adjustAudio(work.songId).then(returnObject => {
                logger.debug("Daemon - Volume adjusted for song "+work.songId);
              }).catch(err => {
                logger.error(err.stack);
              });
            }
            else if (returnObject == 1){
              logger.error("Daemon - Can't download song "+work.songId);
              logger.info("Daemon - Need to see if there is new version of youtube-dl.");
              //Tratar de actualizar el programa de descargas.
              await YoutubeDL.updateTool().then(returnObject => {
                if (returnObject.code == 0)
                  logger.debug("Daemon - youtube-dl updated.");
                else {
                  logger.debug("Daemon - youtube-dl hasn't new version.");
                  WorkTodo.updateMany(
                    {songId:work.songId, state:"new"},
                    {$set: { state:"err-dwn", dateLastMovement:Date.now() }}, function(err, newwork){
                      logger.debug("Daemon - Songs marked as 'err-dwn': "+JSON.stringify(newwork)); 
                    }
                  );
                }
              }).catch(err => {
                logger.error(err.stack);            
              });               
            }
          }).catch(err => {
            logger.error(err.stack);
          });          
        }        
      });

    });

    //TODO: Si pierdo la autorización del usuario debo mandarle un mail solicitándosela.
    //  SI HUBIESE ALGÚN ERROR DEMASIADO GRAVE SALIR DEL BUCLE Y FINALIZAR DEMONIO?
  } while (active);
}

//Run the loop
loop();