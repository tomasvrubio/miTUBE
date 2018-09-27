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

      if (uploads.length==0)
        logger.debug("Nothing to upload.");
      else{
        logger.debug("Songs to upload...");
        for (const work of uploads){  
          if (fs.existsSync("./tmp/"+work.songId+".mp3")){
            
            await YoutubeDL.changeMetadataAlbum(work.songId, work.listName).then(returnObject => {
              logger.debug("Album metadata changed to "+work.listName+" for song "+work.songId);
            }).catch(err => {
              logger.error(err.stack);
            });
            
            logger.debug("Uploading song "+work.songId+" for user "+work.email);
            await Gmusic.upload(work.email, userMacs[work.email], work.songId).then(returnObject => {
              console.log(returnObject);
              //TODO: ¿y ahora como me quedo con este id que me devuelve para la canción? He visto que para una misma canción y distintos usuarios devuelve exactamente el mismo id. ¿Me sirve para poder eliminarla después?
              // ./tmp/FYH8DsU2WCk.mp3 (3c2ca648-b7e1-3cba-aee3-5f1a8da8f7c2)
              // ./tmp/5k65sjY7csQ.mp3 (33a6b071-d50d-3a59-a615-579759d8afdf)	

              if (returnObject == 0){
                logger.debug("Ended uploading song.");

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
              logger.error(err.stack);
            });
          }
          else{
            logger.error("No file found for song "+work.songId);
            work.state = "err";
            work.dateLastMovement = Date.now();
            work.save();
          }
        }
      }
      
      await WorkTodo.findOne({state:"new"}).then(async function(work){ 
        if (work==null) {
          logger.debug("Nothing to download. Sleeping...");
          await sleep(10000); //TODO: Adjust SLEEP TIME (ms)
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
              logger.error("Can't download song "+work.songId);
              //Paso las canciones a "err" para que no las esté reintentando??? Luego desde una web de administración podría hacer que todas rearrancasen.
              //Para este caso debería ver si hay una nueva versión del programa. //En caso de que no lo hubiese, como puedo estar fallando durante horas, debería dormir el programa unos cuantos minutos. ¿Y me podría avisar?
              WorkTodo.updateMany(
                {songId:work.songId, state:"new"},
                {$set: { state:"err", dateLastMovement:Date.now() }}, function(err, newwork){
                  logger.debug("Songs marked as 'err': ");
                  console.log(newwork);
                }
              );  
            }
          }).catch(err => {
            logger.error(err.stack);
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