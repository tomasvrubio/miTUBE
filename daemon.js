var nodemailer = require('nodemailer'),
    mongoose = require('mongoose'),
    fs = require('fs'),
    {IncomingWebhook} = require('@slack/webhook'),
    credentials = require('./credentials.js');

var WorkTodo = require('./models/workTodo.js'),
    WorkDone = require('./models/workDone.js'),
    User = require('./models/user.js'),
    List = require('./models/list.js'),
    ListUser = require('./models/listUser.js');

var Gmusic = require('./lib/gmusic.js')(),
    YoutubeDL = require('./lib/youtubedl.js')(),
    logger = require('./lib/logger');

var slackBot = new IncomingWebhook(credentials.slack.webhook_url);

mongoose.connect(credentials.mongo.connectionString, {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useFindAndModify', false);

var active = 1; //To mantain de loop alive

//Promise to sleep the loop when its not necesary
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

//Declaration of the loop in async mode so we can call "await" inside to wait for promise end.
async function loop() {
  do {
    logger.info("Daemon - Another iteration.");

    //TODO: Comprobar si el proceso de mi padre ha parado. En ese caso el demonio finaliza



    //Search for songs to delete
    await Promise.all([
      WorkTodo.find({state:"del"}),
      User.find({},{"_id":0, "email":1, "mac":1})
    ]).then(async ([deletes, users]) => {

      userMacs = Object.assign({}, ...users.map(person => ({[person.email]: person.mac})));

      if (deletes.length==0)
        logger.debug("Daemon - Nothing to delete.");
      else{
        logger.debug("Daemon - Songs to delete...");
        //////
        for (const work of deletes){

            if (!work.tries) work.tries=0;
            work.tries++;
            work.save();
            if (work.tries <= 5) {
              logger.debug("Daemon - Deleting "+work.songId+" song for "+work.email);

              if (!work.gmusicId){
                logger.debug("Daemon - No gmusicId. Its posible that song isn't uploaded yet.");
              }

              //Elimino el trabajo de gmusic.
              await Gmusic.delete(work.email, userMacs[work.email], work.gmusicId, work.songId).then(returnObject => {

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

                  WorkTodo.deleteMany({email: work.email, listId: work.listId, songId:work.songId, state:{$ne:"del"}, dateLastMovement:{$lt:work.dateLastMovement}}).then( workNotNeeded => {
                    logger.debug("Daemon - Pending work for this user and song removed.");
                    logger.debug("Daemon - Upload work not done and deleted because a registered delete is more recent: "+JSON.stringify(workNotNeeded));
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
            } else {
              logger.error("Daemon - Reached max tries deleting.");
              work.state = "err-del-triedMax";
              work.dateLastMovement = Date.now();
              work.save();
            }
        }
        /////
      }
    });


    //TODO: Buscar trabajos de imagen y hacer los cambios en gmusic. En caso de encontrarlos habría que modificar esa canción y por lo que he visto tambień el resto de canciones que tengo ya subidas de la lista. ¿Puedo hacerlo sin tener que eliminar y volver a subir la canción entera?
    //Yo creo que vale con eliminar una canción y subir otra.


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
        ////////////
        for (const work of uploads){
          if (!work.tries) work.tries=0;
          work.tries++;
          work.save();
          if (work.tries <= 5) {
            if (fs.existsSync("./tmp/"+work.songId+".mp3")){

              await YoutubeDL.changeMetadataAlbum(work.songId, work.listName).then(returnObject => {
                logger.debug("Daemon - Album metadata changed to "+work.listName+" for song "+work.songId);
              }).catch(err => {
                logger.error(err.stack);
              });

              //Update cover because can change since upload work was registered
              await ListUser.findOne({"listId":work.listId, "email":work.email},{"_id":0, "imageId":1}).then(cover => {
                work.imageId = cover.imageId;
              }).catch(err => {
                logger.error(err.stack);
              });

              logger.debug("Daemon - Uploading song "+work.songId+" for user "+work.email);
              await Gmusic.upload(work.email, userMacs[work.email], work.songId, work.imageId).then(async function(returnObject) {
                logger.debug("Daemon - Gmusic returns: "+JSON.stringify(returnObject));

                if (returnObject.code == 0){
                  logger.debug("Daemon - Ended uploading song.");

                  if (returnObject.uuid == 0){
                    logger.debug("Daemon - No uuid, need to obtain it");
                  }

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
                    logger.debug("Daemon - Pending uploads of "+work.songId+": "+(uplWork-1));
                    if (uplWork <= 1){
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
                } else if (returnObject.code == 2){
                  logger.debug("Daemon - File size bigger than allowed (300MB max).");
                  work.state = "err-upl-sizeMax";
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
          } else {
              logger.error("Daemon - Reached max tries uploading.");
              work.state = "err-upl-triedMax";
              work.dateLastMovement = Date.now();
              work.save();
          }
        }
        ////////
      }



      //Search for songs to download
      await WorkTodo.findOne({state:"new"}).then(async function(work){
        if (work==null) {
          logger.debug("Daemon - Nothing to download. Sleeping "+credentials.daemon.sleepTime+"ms ...");
          await sleep(credentials.daemon.sleepTime);
        }
        //////
        else {
          if (!work.tries) work.tries=0;
          work.tries++;
          work.save();
          if (work.tries <= 5) {

            logger.debug("Daemon - Need to download "+work.songId);

            await YoutubeDL.download(work.songId).then(async function(returnObject){
              if (returnObject == 0) {
                logger.debug("Daemon - Song "+work.songId+" downloaded.");
                await WorkTodo.updateMany(
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
          } else {
            logger.error("Daemon - Reached max tries downloading.");
            work.state = "err-dwn-triedMax";
            work.dateLastMovement = Date.now();
            work.save();
          }
        }
        //////
      });

    });

    //TODO: Si pierdo la autorización del usuario debo mandarle un mail solicitándosela.
    //  SI HUBIESE ALGÚN ERROR DEMASIADO GRAVE SALIR DEL BUCLE Y FINALIZAR DEMONIO?
  } while (active);

  slackBot.send({
    text: '*ERROR* :'+credentials.ENT+': El demonio se ha parado.',
  }).catch(err => {
    logger.error("No ha sido posible mandar mensaje a SLACK.");
    logger.error(JSON.stringify(err.stack));
  });
}

slackBot.send({
  text: '*INFO* :'+credentials.ENT+': Se ha arrancado el demonio.',
}).catch(err => {
  logger.error("No ha sido posible mandar mensaje a SLACK.");
  logger.error(JSON.stringify(err.stack));
});

//Run the loop
loop();