# miTUBE  [WIP]
Web application to synchronize music of the videos you have in Youtube Lists to your devices through Google Music.

### Requisitos

* nodejs
* npm
* mongodb
* python3 (Ultima version: https://gist.github.com/SeppPenner/6a5a30ebc8f79936fa136c524417761d)
* pip3 (sudo pip3 install --upgrade pip setuptools wheel)
* librerias python para youtube-dl: libav-tools (sudo apt-get install -y libav-tools)
* gms [google-music-scripts] (pip3 install google-music-scripts --user)
* youtube-dl (pip3 install youtube-dl --user)
  * Requerido instalar "ffmpeg" [FEDORA]
  * Actualización cuando empecemos a detectar errores en descarga.
* mid3v2 (sudo apt-get install python-mutagen)
* mp3gain (sudo apt-get install mp3gain)

### Instalación

* Descarga repositorio github
* Lanzar "npm install"
* Introducir las credenciales en *credentials.js*
* Lanzar "node app.js"


### Estructura fichero *credentials.js*:

```
module.exports = {
  port: PORT,
  subdomain: '/', //For production "/mitube/"
  cookieSecret: 'your cookie secret goes here',
  gmail: {
    user: 'email',
    password: 'pass',
  },
  mongo: {
    connectionString: 'your_connection_string',
  },
  youtube: {
    apiKey: 'xxxxxx',
  },
  logger: {
    levelFile: 'debug',
    levelConsole: 'silly',
  },
  daemon: {
    active: false,
    sleepTime: 10000, //Miliseconds between daemon executions
  },
  checkPlanification: '00 03 * * *', //Planification for checking all lists in app
};
```


### Tareas pendientes:

* Montar entorno Producción (Cap 12).
* Usar https -> Seguir tutorial que tengo en el móvil.
* TODO NUEVO:
  * ¿Por qué me falla al llamar a gmusic? ¿Qué trazas puedo meter? Probar a hacer la llamada sin más desde la terminal y luego probar distintas llamadas desde el inicio de la app (¿me falla el spawn?)
    - Era por estar levantando el proceso con root. Con iptables he apuntado a otro puerto
    - Ahora me falla porque he superado el limite. ¿Esto era por repetir MAC o hay algo con los dispositivos desde los que pruebo el usuario? Probar con el usuario de otra persona.
      Probar ahora con desarrollo...
      He visto que tenía demasiados dispositivos en la cuenta
  

* usuarios pruebas:

{"name":"Nuevo","email":"nuevo@gmail.com","pass":"6299682331407033"}



* Notas para Fetch:

//Si lo llamo con la info en JSON
fetch('/url', {
  method: 'post',
  body: JSON.stringify(data),
  headers: { 'Content-type': 'application/json' }
})

//Si lo llamo con la información en la URL
fetch('/url', {
  method: 'post',
  body: 'firstName=Nikhil&favColor=blue&password=easytoguess',
  headers: { 'Content-type': 'application/x-www-form-urlencoded' }
})

//Plantilla:
  fetch('url', {
    ...
  })
  .then(response => {
    if (response.ok) {
      return response.json()
    } else {
      return Promise.reject({
        status: response.status,
        statusText: response.statusText
      });
    }
  })
  .then(data => console.log('data is', data))
  .catch(error => console.log('error is', error));


  * Hay nueva librería para toda la gestión con google music:
  https://github.com/thebigmunch/google-music-scripts

  Ya he dejado todo integrado (UPLOAD y DELETE).

  Otras cosa que puedo utilizar:

  * quota : Para saber cuanto espacio ha utilizado el usuario

  [tomas@fundacion tmp]$ gms quota -u desarrollovazquezrubio@gmail.com --uploader-id "B9:27:EB:F5:91:2C"
  [2018-11-12 18:03:46] Logging in to Google Music
  [2018-11-12 18:03:49] Quota -- 10/50000 (0.02%)

  * playlists : Estoy esperando a que @thebigmunch incluya funcionalidad de playlists (para dejar de utilizar el metadata del album).

  * albumArt : Estoy esperando a que @thebigmunch incluya funcionalidad de subida de imágenes (para que los usuarios tengan una imagen por pantalla de la playlist).



* Controlar cuando el demonio me devuelva esto en un subida:
2018-11-13T05:48:05.888Z [debug]: Daemon - Uploading song 3tUh-x-fp8Q for user cristomboda@gmail.com
spawnSTDERR:[2018-11-13 06:48:06] Logging in to Google Music

spawnSTDOUT:Visit:

https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=652850857958.apps.googleusercontent.com&redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fmusicmanager&state=pmU90izuu1r3wTLyHKcmoWT8uDHqOP&access_type=offline&prompt=consent

Follow the prompts and paste provided code: 


* Para modificar varios registros de una vez: 

db.worktodos.update({state:'err-del'}, {$set: {state:'del'}}, {multi: true});


### Problemas encontrados:

+ * En chrome no ajusta bien el tamaño de las columnas con col-5 col-2 ... Hay que hacerlo con el estilo width y darle porcentajes. Explicado en  https://stackoverflow.com/questions/15115052/set-up-fixed-width-for-td

+ * No se ve bien en los móviles. Tienen más píxeles de lo que tiene un portátil (al menos el mío con el que estaba haciendo las pruebas). ¿Qué es lo que tengo que hacer para detectar que están abriendo la página desde un móvil y cambiar la manera en que se muestra?

+ * Mientras se están comprobando las cosas del usuario al hacer LOGIN poner algo que lo indique.

+ * Cuando pulses para actualizar todas las listas te indique lo está haciendo. Y cuando termine diga que ya está. Y que después de que desaparezca el alert se vuelva a poner blanco




#### En cuanto como hacer la selección de la imagen para la lista

+ * Terminar de hacer que el dropdown se vea bien. ¿Oculto del todo el botón de la derecha? Y habría que hacer que sólo fuera del tamaño de la imagen y que no se pudiese pulsar lo de alrededor.

+ * Cuando pulso una imagen del listado del dropdown:
  - Esa imagen se pone en la imagen de la ficha.
  - Se manda una petición al servidor para que se registre que el usuario quiere esa imagen para la lista.

+ * Que el listado del dropdown se genere dinámicamente con el contenido del directorio. 

+ * Tener dos imágenes en el directorio: las comprimidas para mostrar en el dropdown y las grandes para subir a google music.

+ * Generar trabajo de modificación de imagen

+ * Modificar subida de canciones para que ahora también se incluya imageId y el filtro necesario en el comando de subida.

+ * Readdir no funciona en Raspberry: La versión de node no me devuelve los tipos de ficheros. He tenido que modificar la manera en que fitraba que no me mostrase la carpeta thumbnail.


#### Resto de cosas a ir implementando:

+ * Mostrar en el listado de canciones las que aún se estén sincronizando y las que hayan dado error. Una bola de un color que si pulsamos salga un tooltip.

* Arreglar el indicador de las cosas pendientes en una lista. Si no indica nada no ponerlo pero pensar que es lo que puedo poner.

* Cuando se levanta el demonio parece que la raspberry llega al límite. ¿Qué es lo que está haciendo por detrás? En principio ya no tenía nada que bajar, está todo en error. Probar a no activarlo para ver si tengo los mismos problemas con la aplicación.

+ * Corregir visualización de carga cuando la pantalla es demasiado ancha.

+ * Corregir visualización pantalla de meter TOKEN google music.

+ * Algún mensaje en la entrada de la aplicación.

+ * Al tratar trabajos para eliminar canciones fijarme en si hay uno de subida con fecha anterior. Borrar y eliminarlo.

* En una parada ordenada apagar el demonio

* Mantener comunicación entre app y daemon

* No levantar demonio si ya hay uno en pie?¿

+ * Al borrar cuando vuelva a levantar la página ya no se encuentre la lista borrada.

+ * Arreglar la manera en que se ve el nombre de la lista para YT.

* ¿Me tengo que desuscribir de los eventos que escucho con los procesos que voy levantando?

+ * Rotado diario de logs

+ * Corregir vista "wait"


#### De la prueba que estoy haciendo con Cris:

+ * Las canciones que no borra aparece como que no hay trabajos pendientes (a 0). Del siguiente listado no ha borrado WRz2MxhAdJo ni OPf0YbXqDm0. Han subido a gmusic??

2019-01-30T18:41:14.958Z [debug]: Daemon - Pending uploads of SSFx-1IagAk: 1
2019-01-30T18:42:34.390Z [debug]: Daemon - Pending uploads of WRz2MxhAdJo: 0
2019-01-30T18:45:09.179Z [debug]: Daemon - Pending uploads of KrZHPOeOxQQ: 1
2019-01-30T18:47:13.158Z [debug]: Daemon - Pending uploads of uzWO7O-qHWI: 1
2019-01-30T18:47:49.882Z [debug]: Daemon - Pending uploads of 9SKFwtgUJHs: 1
2019-01-30T18:49:26.488Z [debug]: Daemon - Pending uploads of lDK9QqIzhwk: 1
2019-01-30T18:50:48.677Z [debug]: Daemon - Pending uploads of fkYVMLplZrw: 1
2019-01-30T18:53:32.266Z [debug]: Daemon - Pending uploads of BN1WwnEDWAM: 1
2019-01-30T18:54:06.365Z [debug]: Daemon - Pending uploads of btPJPFnesV4: 1
2019-01-30T18:55:38.102Z [debug]: Daemon - Pending uploads of KDXOzr0GoA4: 1
2019-01-30T18:57:09.712Z [debug]: Daemon - Pending uploads of QEZq4I2wTBc: 1
2019-01-30T19:00:19.199Z [debug]: Daemon - Pending uploads of Fi8rsCncwF8: 1
2019-01-30T19:00:51.316Z [debug]: Daemon - Pending uploads of OPf0YbXqDm0: 0

He puesto el filtro a borrar <= 1

+ * El demonio ha parado de trabajar. Le tocaba subir una canción pero en principio ya no está haciendo nada.

Era porque mp3gain pedía confirmación. He puesto ya la opción para que vaya en automático.

+ * ¿Estoy esperando bien entre pasos? Cuando pasa x tiempo acaba haciendo cosas en simultaneo???

En principio no he visto nada que lo evidencie. Sólo he puesto un await antes de modificar la ganancia.

* Añadir más opciones de imágenes. La que sea por defecto, ¿pongo una interrogación?

PRUEBAS ENTORNO DESARROLLO
PepePruebasAdmin -> desa -> u507i9d
tomeisi -> tomasvrub -> b90mi1yh
{"email":"waitign2345@gmail.com","password":"fk4gszdm"} [sin permiso]