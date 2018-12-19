# miTUBE  [WIP]
Web application to synchronize music of the videos you have in Youtube Lists to your devices through Google Music.

### Requisitos

* nodejs
* npm
* mongodb
* python3 (Ultima version: https://gist.github.com/SeppPenner/6a5a30ebc8f79936fa136c524417761d)
* pip3 (sudo pip3 install --upgrade pip setuptools wheel)
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
  cookieSecret: 'your cookie secret goes here',
  gmail: {
    user: 'email',
    password: 'pass',
  },
  mongo: {
    connectionString: 'your_connection_string',
  },
};
```


### Tareas pendientes:

* Montar entorno Producción (Cap 12).
* Usar https -> Seguir tutorial que tengo en el móvil.
* TODO NUEVO:
  * ¿Por qué se ve bien si simulo un movil en el PC y se ve tan pequeño en el teléfono? ¿Cual es la mejor herramienta para simular navegaciones en distintas pantallas?
    - Tiene que ser por resolución. 
  * ¿Por qué me falla al llamar a gmusic? ¿Qué trazas puedo meter? Probar a hacer la llamada sin más desde la terminal y luego probar distintas llamadas desde el inicio de la app (¿me falla el spawn?)
    - Era por estar levantando el proceso con root. Con iptables he apuntado a otro puerto
    - Ahora me falla porque he superado el limite. ¿Esto era por repetir MAC o hay algo con los dispositivos desde los que pruebo el usuario? Probar con el usuario de otra persona.
      Probar ahora con desarrollo...
      He visto que tenía demasiados dispositivos en la cuenta
  * Cambiar imagen correo.
    - Hecho
  * Cambiar links correo.
    - Hecho
  * ¿Cómo hago para alojar varias webs desde la raspi? ¿Hay que poner un nginx delante?
    - Con nginx. Hacer algún tutorial (pero siempre hablan utilizando un dominio y yo lo que tengo es dataplicity)
  
  * Poner mac con dos digitos siempre
      Hecho (padStart)
  * Variable para despertar demonio cuando quiera
      Hecho
  * Imagen correo
      Pasado svg a png
  * Hacer que se vea bien en móviles

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