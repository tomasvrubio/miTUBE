var fs = require('fs'),
    List = require('../models/list.js'),
    ListUser = require('../models/listUser.js'),
    WorkTodo = require('../models/workTodo.js');

module.exports = function(){

    return {
        checkUpdated: function(email, listId) {
            //Comprobar que la lista tiene todas las canciones sincronizadas. En caso de que haya alguna que no lo esté la meteríamos en la tabla en la que almacenamos las canciones en las que hay trabajo pendiente.
            return new Promise((resolve, reject) => {
                if (!email || !listId) 
                    return reject(new Error('No Parameters Provided'));

                Promise.all([
                    ListUser.findOne({email:email, listId: listId}),
                    List.findOne({listId:listId})
                  ]).then( ([listUser, list]) => {
                    if (listUser == null || list == null){
                      console.log("Lista sin detalles almacenados.");
                      return reject(new Error("Lista sin detalles almacenados."));
                    }

                    if (listUser.updated == null)
                        var newSongs = list.songs;
                    else
                        var newSongs = list.songs.filter(song => song.added > listUser.updated);

                    newSongs.forEach(function(song){
                        WorkTodo.insertMany({
                            songId: song.songId, 
                            listId: listId,
                            email: email, 
                            state: "new",
                            dateLastMovement: Date.now(),
                        },function(err){
                            if(err) console.error(err.stack);
                        });
                    });

                    //Actualizamos la fecha en la que se ha actualizado la relación de lista del usuario
                    listUser.updated = Date.now();
                    listUser.save(function(err) {
                        if(err) console.error(err.stack);
                        return resolve();
                    });
                });                   
            });
        },
        checkNewSongs: function(ytApiKey, listId, lastSongDate) {
            //Comprobamos si hay alguna canción en la playlist de Youtube que no esté cargada en la tabla List
            return new Promise((resolve, reject) => {
                var newSongs = {};
                Youtube.listItems(ytApiKey, listId).then(playlistItems => {
                    var itemsMapped = playlistItems.map(function(item){
                      return {
                        songId: item.resourceId.videoId,
                        originalName: item.title,
                        added: item.publishedAt                  
                      }
                    });

                    //Tenemos que mirar la fecha del último de los elementos recuperados. Si es más actual que la fecha lastSongDate (fecha de la ultima cancion dentro de List) habría que revisar cuantas canciones hay así y devolverlas. En caso de que no haya ninguna no se devolverá ninguna canción.
                    
                    //CONTINUAR!!!! - Mirar hasta donde tengo que hacer aquí y cuanto hago en la función anterior.
                    //1 - Caso de ser la primera vez que sincronizamos. Como la fecha Updated estará vacía podemos directamente enchufar todas las canciones a la tabla. Después introducimos fecha Updated.
                    //2 - Caso de no ser la primera. Comparamos la fecha Updated y para aquellas canciones que tengan una fecha mayor:
                    //  2.1 - Las introducimos en la tabla en la que almacenamos las canciones de la lista
                    //  2.2 - Las introducimos en la tabla de trabajo pendiente.
                    //  2.3 - Actualizamos la fecha de actualización en la lista de relaciones de listas-usuarios.
                    //* - Tendría que comprobar que no hay otros usuarios con la misma lista sincronizada porque en ese caso habría qeu generar más trabajos similares y aprovechar que voy a descargar la canción para subirla a todos los perfiles de googleMusic.


                });



                //Cuando haya terminado tengo que devolver las canciones nuevas (si las hay)
                return resolve(newSongs);
            });  
        }
    }
};