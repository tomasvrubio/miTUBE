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
* Implementar llamadas a gmusicapi
  - ¿Como hacemos el primer login para conseguir el oauth? 
    Desde la terminal lo que hacía era 
    gmupload -U 'B8:27:EB:F5:91:27' -c luisvv -l 'The Cure - Boys Don'\''t Cry.mp3'

    Tengo que utilizar un audio de prueba ligero para subir y eliminarlo cuando ya tenga el acceso confirmado.

    URL para conseguir el token? Hacer pruebas desde la terminal y poner en la app un boton para hacer la redirección a la URL y copiar la cadena que devuelva en un formulario. Con eso llamar a gmupload.

    Para hacer las llamadas a los programas python (gmusicapi y youtube-dl) voy a utilizar "python-shell":
    https://www.npmjs.com/package/python-shell

    Realmente no tengo que utilizar ese módulo sino que necesito algo que haga llamadas "shell" ya que son ejecutables que llamo directamente desde la terminal. Tengo que utilizar "child_process".

    Tengo que cortar la cadena stdout para quedarme con la url. Empieza con https y termina con un blanco.