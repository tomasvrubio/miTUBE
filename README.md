# miTUBE
web application to generate music lists from youtube lists

### Requisitos

* nodejs
* mongodb


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

* Utilizar librería morgan para dejar logs.
* Montar entorno Producción (Cap 12).
* Usar https