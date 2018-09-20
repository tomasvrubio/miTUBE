var nodemailer = require('nodemailer')
    mongoose = require('mongoose'),
    fs = require('fs');
    credentials = require('./credentials.js');

var WorkTodo = require('./models/workTodo.js');

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
    
    await WorkTodo.find({state:"upl"}).then(async function(uploads){       
      
      if (uploads.length==0)
        console.log("Sin subidas que realizar.");
      else{
        console.log("Hay que subir:")
        console.log(uploads);
        uploads.forEach(function(work){
          if (fs.existsSync("./tmp/"+work.songId+".mp3")){
            console.log("Existe el archivo para la canción " + work.songId);
            //        Subir canción para los usuarios que haya trabajo registrado (será 1 o más). 
            //        Con confirmación positiva eliminar mp3 y pasar trabajo de TODO a DONE. 
          }
          else{
            console.log("No hay archivo para la canción " + work.songId);
            work.state = "err";
            work.dateLastMovement = Date.now();
          } 
        });

        console.log("Se ha modificado uploads tras el forEach??");
        console.log(uploads);
        //uploads.save(); //TODO: Tras las pruebas dejar de comentarlo
      }

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
              work.state = "upl";
              work.dateLastMovement = Date.now();
              work.save();
            }
            else if (returnObject == 1)
              console.log("No se ha podido descargar la canción.");
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