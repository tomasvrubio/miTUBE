# miTUBE
web application to generate music lists from youtube lists

### Requisitos

* nodejs
* mongodb


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
* Mejorar el rastreado de nuevas canciones. Comparación dos listas buscando coincidencias y elementos que no están en una ni en la otra (nuevas y eliminadas).
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
* Cambiar query para hacer push de todas las canciones nuevas y no ir una a una.
* Implementar llamadas a gmusicapi
  - ¿Como hacemos el primer login para conseguir el oauth? 
    Desde la terminal lo que hacía era 
    gmupload -U 'B8:27:EB:F5:91:27' -c luisvv -l 'The Cure - Boys Don'\''t Cry.mp3'

    Tengo que utilizar un audio de prueba ligero para subir y eliminarlo cuando ya tenga el acceso confirmado.

    URL para conseguir el token? Hacer pruebas desde la terminal y poner en la app un boton para hacer la redirección a la URL y copiar la cadena que devuelva en un formulario. Con eso mandar la información al proceso de gmupload.

    Para hacer las llamadas a los programas python, que realmente son programas que llamo desde la shell, (gmusicapi y youtube-dl) voy a utilizar "child_process".

    Tengo que cortar la cadena stdout para quedarme con la url. Empieza con https y termina con un blanco. No, lo hago con los saltos de línea.

    ¿Como almaceno la información del proceso entre petición y petición?
    No lo necesito hacer. La URL es estática entre peticiones. Hago una petición, consigo URL, cierro programa. Paso la url al usuario, que introduzca el código de autorización y con su respuesta vuelvo a llamar a gmupload y ya lo autorizo creando así el token.

    Vigilar cuando en la respuesta viene **NOT_SUBSCRIBED** ya que tiene pinta de que es cuando no tiene habilitado en su perfil googleMusic ni tiene forma de pago asociada. 