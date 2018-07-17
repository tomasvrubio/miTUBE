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

                //Mirar la ultima vez que hemos 
                Promise.all([
                    ListUser.findOne({email:email, listId: listId}),
                    List.findOne({listId:listId})
                  ]).then( ([listUser, list]) => {
                    if (listUser == null || list == null){
                      console.log("Lista sin detalles almacenados.");
                    }

                    //Todo esto lo tengo que corregir. En la misma función de filtrado, como ya estoy 1 a 1, me quedo con los campos que quiero (el map) y guardo el registro en BBDD.
                    var newSongs = list.songs.filter(song => song.added > listUser.updated);
                    console.log(newSongs);
                    if (newSongs != null){
                        console.log("Hay canciones nuevas con las que trabajar.");
                        //Aqui tenemos que insertar esas nuevas canciones en el listado de workTodo
                        var newSongsPrepared = newSongs.map(function(song){
                            return {
                                songId: song.songId,
                                listId: listId,
                                email: email, 
                                state: "new",
                                dateLastMovement: Date.now(),
                            }
                        });
                        newSongsPrepared.forEach(function(song){
                            console.log(song);
                            const newTodoObj = new WorkTodo(song);
                            newTodoObj.save();
                        });
                        //Además tenemos que actualizar la fecha de updated en listUser.
                    }
                    //Hasta aquí. No tiene sentido como lo estoy haciendo.
                });

                //Cuando haya terminado tengo que devolver el objeto resultado 
                    // return resolve(list);
            });
        }
    }
};