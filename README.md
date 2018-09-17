# miTUBE
Web application to synchronize music of the videos you have in Youtube Lists to your devices through Google Music.

### Requisitos

* nodejs
* mongodb
* python3
* pip


### Instalación

* Descarga repositorio github
* Lanzar "npm install"
* Crear BBDD mongodb
* Introducir las credenciales en *credentials.js*
* Lanzar "node app.js"


### Estructura fichero *credentials.js*:

```
module.exports = {
  cookieSecret: 'your cookie secret goes here',
  gmail: {
    user: 'email',
    password: 'clave',
  },
  mongo: {
    connectionString: 'your_connection_string',
  },
};
```


### Tareas pendientes:

* Utilizar librería morgan para dejar logs.
* Montar entorno Producción (Cap 12).
* Usar https
* Revisar que creo que tengo un problema con songIds repetidos aunque sea en listas diferentes:

	{ MongoError: E11000 duplicate key error collection: MITUBEDB.lists index: songs.songId_1 dup key: { : "zC30BYR3CUk" }
    at /home/tomas/Documentos/Workspace/Web/#04-miTUBE-arreglandoRepo/miTUBE/node_modules/mongodb-core/lib/connection/pool.js:598:61
    at authenticateStragglers (/home/tomas/Documentos/Workspace/Web/#04-miTUBE-arreglandoRepo/miTUBE/node_modules/mongodb-core/lib/connection/pool.js:516:16)
    at Connection.messageHandler (/home/tomas/Documentos/Workspace/Web/#04-miTUBE-arreglandoRepo/miTUBE/node_modules/mongodb-core/lib/connection/pool.js:552:5)
    at emitMessageHandler (/home/tomas/Documentos/Workspace/Web/#04-miTUBE-arreglandoRepo/miTUBE/node_modules/mongodb-core/lib/connection/connection.js:309:10)
    at Socket.<anonymous> (/home/tomas/Documentos/Workspace/Web/#04-miTUBE-arreglandoRepo/miTUBE/node_modules/mongodb-core/lib/connection/connection.js:452:17)
    at emitOne (events.js:116:13)
    at Socket.emit (events.js:211:7)
    at addChunk (_stream_readable.js:263:12)
    at readableAddChunk (_stream_readable.js:250:11)
    at Socket.Readable.push (_stream_readable.js:208:10)
    at TCP.onread (net.js:597:20)
  name: 'MongoError',
  message: 'E11000 duplicate key error collection: MITUBEDB.lists index: songs.songId_1 dup key: { : "zC30BYR3CUk" }',
  ok: 0,
  errmsg: 'E11000 duplicate key error collection: MITUBEDB.lists index: songs.songId_1 dup key: { : "zC30BYR3CUk" }',
  code: 11000,
  codeName: 'DuplicateKey' }
* Implementar llamadas a gmusicapi.
  [x] Generar TOKEN.
  [] Subir cancion.
  [] Eliminar cancion. 

* Implementar descargar canciones.

* ¿Donde almaceno la información sobre que MAC voy? Tengo que dar una a cada usuario y ha de ser la consecutiva a la anterior que di. ¿Una función que al levantar el servidor se encargue de ver cual es la mayor MAC en la BBDD y la guarde en memoria y ya luego lo utilice de contador para saber que proporcionar a los usuarios?
  Que al generar un usuario nuevo haya una formula que calcule su mac.
  X.X.X.Y.Y.Z
    X prefijado.
    Y aleatorio con la primera vez que se levante el servidor o bien el primerisimo de todos los usuarios.
    Z contador con el número de usuarios que tengamos.  

* ¿Cómo se que un usuario se conecta por primera vez? Lo necesito para que esa primera vez sincronice con googleMusic y consiga su token de autenticación. Luego ya no se debe solicitar nunca más. Se me ocurre variable en BBDD que cargue cuando haga login y que luego ya se almacene en la información del usuario. ¿su cookie o tengo otro sitio mejor y que no esté viajando por la red?