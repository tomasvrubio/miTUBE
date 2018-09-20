var List = require('../models/list.js'),
    ListUser = require('../models/listUser.js'),
    WorkTodo = require('../models/workTodo.js'),
    Youtube = require('./youtube.js')();

module.exports = function(){
    function getListDiferences(apiKey, listId, newEtag){
    //Se encarga de revisar que canciones se han modificado en la lista de YT. Podemos tener canciones que ya no estén o canciones nuevas.    
        return new Promise((resolve, reject) => {
            Promise.all([
                Youtube.listItems(apiKey, listId),
                List.findOne({listId:listId})
            ]).then( ([newList, oldList]) => {
                var newListSongs = newList.map(function(item){
                    return {
                        songId: item.resourceId.videoId,
                        originalName: item.title,
                        added: item.publishedAt                  
                    }
                });

                //Hago un array para almacenar los índices de canción recuperados y poder comparar.
                var newListArray = newListSongs.map(song => song.songId);
                var oldListArray = oldList.songs.map(song => song.songId);

                //Calculamos las diferencias
                var deletedSongs = oldListArray.filter(x => !newListArray.includes(x));
                var newSongs = newListArray.filter(x => !oldListArray.includes(x));

                //Antes o después de borrarlas debería hacer algo con ellas. Mandarlas a la tabla de work para realizar su baja!!!
                //¿Que necesito para realizar la baja de las canciones?

                //Canciones a eliminar
                if (deletedSongs.length){                    
                    List.findOneAndUpdate({listId:listId},
                        { $pull: {songs: {songId: {$in: deletedSongs}}}},
                        { multi: true },
                        function(err){
                            if(err){
                                console.error(err.stack);
                                return reject(new Error('No posible modificar canciones de lista'));
                            }
                            console.log("Se han eliminado "+deletedSongs.length+" canciones.");
                        }
                    );
                }
              
                //Canciones a introducir
                var insertList = newListSongs.filter(x=>newSongs.includes(x.songId));
                List.findOneAndUpdate({listId:listId},
                    { $set: {etag: newEtag, updated: Date.now()}, 
                      $push: {songs: insertList}},
                    { multi: true },
                    function(err){
                        if(err){
                            console.error(err.stack);
                            return reject(new Error('No posible modificar canciones de lista'));
                        }

                        console.log("Se han añadido "+newSongs.length+" canciones.");
                        
                        generateWorkUpload(listId).then(returnObject => {
                            console.log("Canciones lista "+listId+" metidas en WorkTodo");
                        }).catch(err => {
                            console.error(err.stack);
                        });

                        return resolve(null);
                    }
                );           
            });
        });
    }

    //Detecta si una lista ha sido modificada.
    function checkUpdatedList(apiKey, listId) {
        return new Promise((resolve, reject) => {
            console.log("Comprueba lista: " + listId);

            if (!apiKey || !listId) 
                return reject(new Error('No Parameters Provided'));

            Promise.all([
                Youtube.listEtag(apiKey, listId),
                List.findOne({listId:listId})
            ]).then( ([newEtag, list]) => {
                if (list.etag != newEtag){
                    console.log("Se ha modificado el etag. Lista pendiente de actualizar.");
                    getListDiferences(apiKey, listId, newEtag).then(returnObject => {
                        return resolve(null);
                    });
                }
                else {
                    console.log("No se ha modificado el etag. Lista actualizada.");

                    list.updated = Date.now();
                    list.save();
                    return resolve(null);
                }
            }).catch(err => {
                console.error(err.stack);
            });
        });
    }

    //Comprueba todas las listas del usuario.
    function checkUpdatedUser(apiKey, email) {
        return new Promise((resolve, reject) => {
            console.log("Compruebo las listas del usuario: "+email);

            if (!apiKey || !email) 
                return reject(new Error('No Parameters Provided'));

            ListUser.find({email:email}, function(err, lists){ 
                if (err) console.error(err.stack);

                lists.forEach(function(list, index){
                    checkUpdatedList(apiKey,list.listId).then(returnObject => {
                        console.log("Comprobado actualización lista " + list.listId);
                        if (index == lists.length-1)
                            return resolve(null);
                    });
                });
            });
        });
    }

    //Comprueba todas las listas registradas en la aplicación.
    function checkUpdatedAll(apiKey) {
        return new Promise((resolve, reject) => {
            console.log("Compruebo todas las listas de la aplicación.");

            if (!apiKey) 
                return reject(new Error('No Parameters Provided'));

            List.find({}, function(err, lists){ 
                if (err) console.error(err.stack);

                lists.forEach(function(list, index){
                    checkUpdatedList(apiKey,list.listId).then(returnObject => {
                        console.log("Comprobado actualización lista " + list.listId);
                        if (index == lists.length-1)
                            return resolve(null);
                    });
                });
            });
        });
    }

    //Carga en workTodo todo aquello que haya que subir a googleMusic
    function generateWorkUpload(listId){
        return new Promise((resolve, reject) => {
            Promise.all([
                List.findOne({listId:listId}),
                ListUser.find({listId:listId})
            ]).then( ([list, relations]) => {
                relations.forEach(function(relation, index){
                    if (relation.updated == null)
                        var newSongs = list.songs;
                    else
                        var newSongs = list.songs.filter(song => song.added > relation.updated);

                    console.log("Canciones para generar trabajos: ");
                    console.log(newSongs);
                    
                    //Con el filter ya me he recorrido el array una vez. ¿no puedo juntarlo todo?
                    var upWorks = newSongs.map(function(song){
                        return {
                            songId: song.songId, 
                            listId: listId,
                            email: relation.email, 
                            state: "new",
                            dateLastMovement: Date.now(),                
                        }
                    });

                    //Para meter un array tiene que ir sin "{}"
                    WorkTodo.insertMany(upWorks, function(err){
                        if(err) console.error(err.stack);
                        
                        relation.updated = Date.now();
                        relation.save(function(err) {
                            if(err) console.error(err.stack);
                        });
                    });

                    if (index == relations.length-1)
                        return resolve(null);
                });
            });
        });
    }

    //Carga en workTodo todo aquello que haya que eliminar de googleMusic
    function generateWorkDelete(songs, listId){
        return new Promise((resolve, reject) => {
            
        });
    }

    return {
        createRelation: function(apiKey, listId, listName, email) {
            //Inserta registro en BBDD ListUser para asociar la lista con el usuario.
            return new Promise((resolve, reject) => {
                Youtube.listInfo(apiKey, listId).then(playlistInfo => {
  
                    //En caso de que sea una lista válida de Youtube
                    if (playlistInfo.pageInfo.totalResults == 1){
                        ListUser.insertMany({
                            listId: listId, 
                            name: listName, 
                            email: email, 
                            created: Date.now()
                        },function(err){
                            if(err){
                                console.error(err.stack);
                                return reject(new Error('No posible crear registro relación usuario-lista.'));
                            }
                            console.log("Creada relación usuario-lista en BBDD");
                            return resolve(listId);                     
                        });                      
                    }
                    else {
                        console.log("URL de lista de YT no válida.");
                        return reject(new Error('URL de lista de YT no válida.'));
                    }                    
                });
            });
        },

        createList: function(apiKey, listId) {
            //Genera lista en tabla e inserta las canciones sin comprobar las existentes (son todas nuevas).
            return new Promise((resolve, reject) => {
                Youtube.listItems(apiKey, listId).then(playlistItems => {
                    var itemsMapped = playlistItems.map(function(item){
                        return {
                            songId: item.resourceId.videoId,
                            originalName: item.title,
                            added: item.publishedAt                  
                        }
                    });
                    
                    List.insertMany({
                        listId: listId,
                        nameYT: playlistInfo.items[0].snippet.title,
                        etag: playlistItems.etag,
                        updated: Date.now(),
                        songs: itemsMapped
                    },function(err){
                        if(err){
                            console.error(err.stack);
                            return reject(new Error('No posible crear registro canciones lista.'));
                        }
                        return resolve(listId); 
                    });
                });
            });
        },

        checkUpdatedList: checkUpdatedList,

        checkUpdatedUser: checkUpdatedUser,
        
        checkUpdatedAll: checkUpdatedAll,

        generateWorkUpload: generateWorkUpload,
    }
};