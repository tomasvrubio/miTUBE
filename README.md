# miTUBE  [WIP]
Web application to synchronize music of the videos you have in Youtube Lists to your devices through Google Music.

### Requisitos

* nodejs
* mongodb
* python3
* pip
* gmusicapi-scripts (pip3 install gmusicapi-scripts --user)
* Nuevo programa: gms [google-music-scripts] (pip3 install google-music-scripts --user)
* youtube-dl (pip3 install youtube-dl --user)
  * Requerido instalar "ffmpeg" [FEDORA]
  * Actualización cuando empecemos a detectar errores en descarga.
* mid3v2


### Instalación

* Descarga repositorio github
* Lanzar "npm install"
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

* Montar entorno Producción (Cap 12).
* Usar https -> Seguir tutorial que tengo en el móvil.

Para poder eliminar canciones voy a necesitar la pass de gmail de los usuarios... Ponerlo como funcionalidad opcional.

* Corregir pantallas que se muestran mientras se va a avanzando en la autorización de gmusic. Mostrar información de lo que hay que hacer. Cuando ya sólo queda añadir el método de pago indicar que hay que pulsar botón para refrescar la consulta y que si todo va bien se redirigirá al usuario a su página de listas.
  * Si quiero que entre por primera vez en google music: https://play.google.com/music


* Hacer una página de Admin desde la que pueda ver el volumen de trabajos pendientes, en error, poder ver gráficas de uso (para trastear con otras librerías), datos de los usuarios... También una pestaña donde pueda autorizar el acceso de los usuarios. Aún así también lo podré hacer desde un link que llegue al correo del administrador.

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


* ¿Como hago operaciones con las variables en handlebars?


* Para modificar varios registros de una vez: 

db.worktodos.update({state:'err-del'}, {$set: {state:'del'}}, {multi: true});