var fs = require('fs'),
    List = require('../models/list.js'),
    ListUser = require('../models/listUser.js'),
    WorkTodo = require('../models/workTodo.js'),
    Youtube = require('../lib/youtube.js')();

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

                    console.log("Canciones a sincronizar nuevas: ")
                    console.log(newSongs);
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
        
        checkNewSongs: function(ytApiKey, listId, lastSongDate, oldEtag) {
            //Comprobamos si hay alguna canción en la playlist de Youtube que no esté cargada en la tabla List
            return new Promise((resolve, reject) => {
                if (!ytApiKey || !listId || !lastSongDate) 
                    return reject(new Error('No Parameters Provided'));

                Youtube.listModified(ytApiKey, listId).then(newEtag => {
                    var searchedDate = Date.now();
                    if (newEtag != oldEtag){
                        Youtube.listItems(ytApiKey, listId).then(playlistItems => {
                            var newSongs = {};
                            searchedDate = Date.now();
                            var itemsMapped = playlistItems.map(function(item){
                                return {
                                    songId: item.resourceId.videoId,
                                    originalName: item.title,
                                    added: item.publishedAt
                                }
                            });

                            var songsMax = itemsMapped.length;
                            for (var i=songsMax-1; i>=0; i--){
                                if (lastSongDate.toISOString() >= itemsMapped[i].added){
                                    //console.log(i);
                                    if (i != songsMax-1)
                                        newSongs = itemsMapped.slice(-(songsMax-i-1));
                                    else
                                        newSongs = null;
                                    break;
                                }
                            }

                            //¿Y si lo meto en el if anterior y así evito tener que comprobar que sea nulo? ¿O queda así más claro?
                            if (newSongs != null){
                                newSongs.forEach(function(song){
                                    //Esta query tengo que tratar de hacerla con el push para todo el array y así no hacer tantos updates como canciones nuevas haya.
                                    List.findOneAndUpdate({listId:listId},
                                        {$push: {songs: song}},
                                        {safe: true, upsert: true},
                                        function(err) {
                                            if(err){ 
                                            console.error(err.stack);
                                            }else{
                                            console.log("Registro almacenado - Actualizada lista canciones.");
                                            }
                                        }
                                    );
                                });
                            }

                            //Dejamos la fecha de paso por esta función actualizada.
                            List.findOneAndUpdate({listId:listId},
                                {$set: {updated: searchedDate, eTag: newEtag}},
                                {safe: true, upsert: true},
                                function(err) {
                                    if(err){
                                    console.error(err.stack);
                                    }else{
                                    console.log("Registro almacenado - Actualizada fecha busqueda.");
                                    }

                                    //console.log(newSongs);
                                    return resolve(newSongs);
                                }
                            );
                        });
                    }
                    else {  //En caso de que nada haya cambiado dejamos registro de búsqueda
                        List.findOneAndUpdate({listId:listId},
                            {$set: {updated: searchedDate}},
                            {safe: true, upsert: true},
                            function(err) {
                                if(err){
                                console.error(err.stack);
                                }else{
                                console.log("Registro almacenado - Actualizada fecha busqueda.");
                                }

                                return resolve(null);
                            }
                        );     
                    }    
                });
            });  
        }
    }
};