var nodemailer = require('nodemailer')
    mongoose = require('mongoose'),
    credentials = require('./credentials.js');

var Youtube = require('./lib/youtube.js')(),
    Synchronize = require('./lib/synchronize.js')(),
    Gmusic = require('./lib/gmusic.js')(),
    YoutubeDL = require('./lib/youtubedl.js')();

var active = 1; //To mantain de loop alive

//Promise to sleep the loop when its not necesary
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

//Declaration of the loop in async mode so we can call "await" inside to wait for promise end.
async function loop() {
  do {
    console.log("Soy el demonio encargado de trabajar.");
    await sleep(2000); 

    //Idea de como hacerlo.
    //---------------------
    //Consulto si hay trabajos pendientes de subir "upl"
    //  Si hay: 
    //    Comprobar que existe el mp3 en el directorio temporal.
    //      Si hay:
    //        Subir canción para los usuarios que haya trabajo registrado (será 1 o más). Con confirmación                positiva eliminar mp3 y pasar trabajo de TODO a DONE (borrar registro y crearlo en la otra                  tabla) 
    //      No hay: 
    //        Poner el trabajo en "err" y continuar comprobando el resto de trabajos en "upl".
    //  No hay:
    //    Consulto si hay trabajos pendientes de descargar "new"
    //      Si hay:
    //        Descargar canción de trabajo más antiguo. Marcar trabajo como "upl". 
    //        Continuar sin descargar más (Para no acumular archivos en el directorio y que se pueda llenar)
    //      No hay: 
    //           

  } while (active);
}

//Run the loop
loop();