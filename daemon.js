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
    logger.info("Another iteration of the Daemon.");

    //Search for songs to update
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

              if (returnObject.code == 0){
                logger.debug("Ended uploading song.");

                List.findOneAndUpdate(
                  {listId:work.listId, "songs.songId":work.songId}, 
                  {"$set": { "songs.$.gmusicId":returnObject.uuid }}
                ).then(returnObject => {
                  logger.debug("Uuid introduced into List. Returned: "+JSON.stringify(returnObject));
                });

                WorkDone.insertMany({
                  songId: work.songId,
                  listId: work.listId,
                  email: work.email,
                  action: "upl",
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
            work.state = "err-upl";
            work.dateLastMovement = Date.now();
            work.save();
          }
        }
      }

      //Search for songs to delete
      //Aquí deberíamos buscar si hay trabajos para eliminar canciones. En caso de que los haya y tenga la pass del usuario lanzarlos. Si no ponerlos en estado err-del
      
      //Search for songs to download
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

              WorkTodo.updateMany(
                {songId:work.songId, state:"new"},
                {$set: { state:"err-dwn", dateLastMovement:Date.now() }}, function(err, newwork){
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

    //TODO: Si pierdo la autorización del usuario debo mandarle un mail solicitándosela.
    //  SI HUBIESE ALGÚN ERROR DEMASIADO GRAVE SALIR DEL BUCLE Y FINALIZAR DEMONIO?
  } while (active);
}

//Run the loop
loop();