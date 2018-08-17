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
                //var newSongs = {};
                Youtube.listItems(ytApiKey, listId).then(playlistItems => {
                    var searchedDate = Date.now();
                    var itemsMapped = playlistItems.map(function(item){
                      return {
                        songId: item.resourceId.videoId,
                        originalName: item.title,
                        added: item.publishedAt
                      }
                    });

                    //console.log("Items mapeados: " + itemsMapped.length);
                    console.log(itemsMapped);

                    var newSongs = {};
                    var songsMax = itemsMapped.length;
                    for (var i=songsMax-1; i>=0; i--){
                        if (lastSongDate.toISOString() >= itemsMapped[i].added){
                            console.log(i);
                            if (i != songsMax-1)
                                newSongs = itemsMapped.slice(-(songsMax-i-1));
                            else
                                newSongs = null;
                            break;
                        }
                    }

                   
                    //IDEA: Con que el ultimo registro tenga una fecha posterior ya me da indicios de que tengo que revisar el resto. Si no fuera así no tengo que hacerlo. ¿Y si hago un bucle que empiece al revés y en cuanto haya un registro que no lo cumpla parar????
                    //Este bucle y el siguiente realmente los tengo que unir en uno sólo y según encuentro un caso positivo meterlo en la BBDD.

                    console.log("Fecha de corte: " + lastSongDate.toISOString());
                    
                    // newSongs = itemsMapped.filter(song => song.added > lastSongDate.toISOString());
                    // console.log("pinto");
                    // console.log(newSongs);
                    // console.log(newSongs2);
                    // console.log("pinto");
                    
                    if (newSongs != null){
                        //console.log(newSongs);
                        newSongs.forEach(function(song){
                            List.findOneAndUpdate({listId:listId},
                                {$push: {songs: song}},
                                {safe: true, upsert: true},
                                function(err, doc) {
                                    if(err){
                                    console.log(err);
                                    }else{
                                    console.log("Registro almacenado.");
                                    }
                                }
                            );
                        });
                    }

                    //Dejamos la fecha de paso por esta función actualizada.
                    List.findOneAndUpdate({listId:listId},
                        {$set: {updated: searchedDate}},
                        {safe: true, upsert: true},
                        function(err, doc) {
                            if(err){
                            console.log(err);
                            }else{
                            console.log("Registro almacenado.");
                            }
                        }
                    );
                });

                //Cuando haya terminado tengo que devolver las canciones nuevas (si las hay)
                //¿De verdad las tengo que devolver? Ya las estoy metiendo aquí en la BBDD.
                //return resolve(newSongs);
                return resolve();

            });  
        }
    }
};