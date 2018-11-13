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

* Montar entorno Producción (Cap 12).
* Usar https -> Seguir tutorial que tengo en el móvil.

Para poder eliminar canciones voy a necesitar la pass de gmail de los usuarios... Ponerlo como funcionalidad opcional.

* ¿Cómo se que un usuario se conecta por primera vez? Lo necesito para que esa primera vez sincronice con googleMusic y consiga su token de autenticación. Luego ya no se debe solicitar nunca más. Se me ocurre variable en BBDD que cargue cuando haga login y que luego ya se almacene en la información del usuario. ¿su cookie o tengo otro sitio mejor y que no esté viajando por la red?
  * Lo he puesto en el redirect del login satisfactorio. Lo que pasa es que si alguien se pone a navegar por los links de la cabecera de la aplicación sin haber sincronizado con gmusic no habrá nada que se lo impida. Darle una pensada!!

* Corregir pantallas que se muestran mientras se va a avanzando en la autorización de gmusic. Mostrar información de lo que hay que hacer. Cuando ya sólo queda añadir el método de pago indicar que hay que pulsar botón para refrescar la consulta y que si todo va bien se redirigirá al usuario a su página de listas.
  * Si quiero que entre por primera vez en google music: https://play.google.com/music

* ¿Que hago con los trabajos que marco como "err"? Me gustaría hacer una página de admin desde los que pudiese relanzarlos (lo más seguro de que fallen es que no se hayan podido descargar porque haya que actualizar youtube-dl).De err voy a tener "err-dwn" para descarga y "err-upl" para subida al espacio de google del usuario. Me falta un tercero que sería "err-del" para eliminar canciones y no poder acceder al perfil del usuario.

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

  