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
                var newSongs = {};
                Youtube.listItems(ytApiKey, listId).then(playlistItems => {
                    var searchedDate = Date.now();
                    var itemsMapped = playlistItems.map(function(item){
                      return {
                        songId: item.resourceId.videoId,
                        originalName: item.title,
                        added: item.publishedAt
                      }
                    });
                    

                    //IDEA: Con que el ultimo registro tenga una fecha posterior ya me da indicios de que tengo que revisar el resto. Si no fuera así no tengo que hacerlo. ¿Y si hago un bucle que empiece al revés y en cuanto haya un registro que no lo cumpla parar????
                    //Este bucle y el siguiente realmente los tengo que unir en uno sólo y según encuentro un caso positivo meterlo en la BBDD.

                    //Parece que trabajo con fechas diferentes. ¿Utilizar moment? Conseguir isodate como tengo en BBDD y lo que me devuelve YT.
                    console.log(itemsMapped);
                    console.log("Fecha de corte: " + lastSongDate.toISOString());
                    // added: '2018-08-15T05:35:23.000Z' } ]
                    // Fecha de corte: Wed Aug 15 2018 07:43:11 GMT+0200 (CEST)
                    
                    newSongs = itemsMapped.filter(song => song.added > lastSongDate.toISOString());
                    
                    if (newSongs != null){
                        console.log(newSongs);
                        newSongs.forEach(function(song){
                            //Ya meto nuevos registros pero los meto duplicados. ¿Como puedo evitarlo?
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


                    //Tenemos que mirar la fecha del último de los elementos recuperados. Si es más actual que la fecha lastSongDate (fecha de la ultima cancion dentro de List) habría que revisar cuantas canciones hay así y devolverlas. En caso de que no haya ninguna no se devolverá ninguna canción.
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
                return resolve(newSongs);
            });  
        }
    }
};