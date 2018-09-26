# miTUBE  ****WIP****
Web application to synchronize music of the videos you have in Youtube Lists to your devices through Google Music.

### Requisitos

* nodejs
* mongodb
* python3
* pip
* gmusicapi-scripts (pip3 install gmusicapi-scripts --user)
* youtube-dl (pip3 install youtube-dl --user)
  * Requerido instalar "ffmpeg" [FEDORA]
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

* Utilizar librería morgan para dejar logs.
  * Ya instalados WINSTON y MORGAN.
* Montar entorno Producción (Cap 12).
* Usar https
* Implementar llamadas a gmusicapi.
  [x] Generar TOKEN.
  [x] Subir cancion.
  [] Eliminar cancion. 

``` 
gmsync up -U "$mac_lista" -c $usuario_lista "data/$nombre_lista"
```

* ¿Cómo se que un usuario se conecta por primera vez? Lo necesito para que esa primera vez sincronice con googleMusic y consiga su token de autenticación. Luego ya no se debe solicitar nunca más. Se me ocurre variable en BBDD que cargue cuando haga login y que luego ya se almacene en la información del usuario. ¿su cookie o tengo otro sitio mejor y que no esté viajando por la red?
  * Lo he puesto en el redirect del login satisfactorio. Lo que pasa es que si alguien se pone a navegar por los links de la cabecera de la aplicación sin haber sincronizado con gmusic no habrá nada que se lo impida. Darle una pensada!!

* Para identificar las canciones que subo utilizar uno de los metadatos para almacenar el id de la canción. Mirar si realmente lo necesito pero puede ser una opción para después borrar canciones o al menos revisar si lo que tengo en la aplicación y lo que hay subido en google es lo mismo.

* ¿Que hago con los trabajos que marco como "err"? Me gustaría hacer una página de admin desde los que pudiese relanzarlos (lo más seguro de que fallen es que no se hayan podido descargar porque haya que actualizar youtube-dl).

* Corregir pantallas que se muestran mientras se va a avanzando en la autorización de gmusic. Mostrar información de lo que hay que hacer. Cuando ya sólo queda añadir el método de pago indicar que hay que pulsar botón para refrescar la consulta y que si todo va bien se redirigirá al usuario a su página de listas.
  * Si quiero que entre por primera vez en google music: https://play.google.com/music