var fs = require('fs'),
    List = require('../models/list.js'),
    ListUser = require('../models/listUser.js'),
    WorkTodo = require('../models/workTodo.js'),
    Youtube = require('./youtube.js')();

module.exports = function(){
    function getListDiferences(apiKey, listId, newEtag){
    //Se encarga de revisar que canciones se han modificado en la lista. Podemos tener canciones que ya no estén o canciones nuevas.    
        return new Promise((resolve, reject) => {
            Promise.all([
                Youtube.listItems(apiKey, listId),
                List.findOne({listId:listId})
            ]).then( ([newList, oldList]) => {
                //Consigo las nuevas canciones
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
                        }
                    );
                }
              
                //Canciones a introducir
                var insertList = newListSongs.filter(x=>newSongs.includes(x.songId));
                //console.log(insertList);

                //Añadimos las canciones correspondientes:
                List.findOneAndUpdate({listId:listId},
                    { $set: {etag: newEtag, updated: Date.now()}, 
                      $push: {songs: insertList}},
                    { multi: true },
                    function(err){
                        if(err){
                            console.error(err.stack);
                            return reject(new Error('No posible modificar canciones de lista'));
                        }

                        return resolve(null);
                    }
                );           
            });
        });
    }

    function checkUpdatedList(apiKey, listId) {
        return new Promise((resolve, reject) => {
            console.log("Comprueba lista: " + listId);

            if (!apiKey || !listId) 
                return reject(new Error('No Parameters Provided'));

            //Puedo lanzar las dos promesas en paralelo?
            List.findOne({listId:listId}, function(err, list){
                if (err) console.error(err.stack);

                Youtube.listEtag(apiKey, listId).then(newEtag => {
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
                        }
                });
            });

            //TODO: ¿Este return está bien aquí?
            return resolve(null);
        });
    }

    function checkUpdatedUser(apiKey, email) {
        //Sacar de la BBDD un listado de las listas del usuario e ir mandándolas a checkUpdatedList
        return new Promise((resolve, reject) => {
            console.log("Compruebo las listas del usuario: "+email);

            if (!apiKey || !email) 
                return reject(new Error('No Parameters Provided'));

            ListUser.find({email:email}, function(err, lists){ 
                if (err) console.error(err.stack);

                lists.forEach(function(list){
                    checkUpdatedList(apiKey,list.listId).then(returnObject => {
                        console.log("Comprobado actualización lista " + list.listId);
                    });
                });
            });
            //TODO: Devuelvo bien desde aquí?
            return resolve(null);
        });
    }

    function checkUpdatedAll(apiKey) {
        //Sacar de la BBDD un listado de las listas del usuario e ir mandándolas a checkUpdatedList
        //O mejor puedo directamente sacar un listado de todas las listas (por si se repiten entre usuarios) y las actualizo todas.
        return new Promise((resolve, reject) => {
            console.log("Compruebo todas las listas.");

            if (!apiKey) 
                return reject(new Error('No Parameters Provided'));

            List.find({}, function(err, lists){ 
                if (err) console.error(err.stack);

                lists.forEach(function(list){
                    checkUpdatedList(apiKey,list.listId).then(returnObject => {
                        console.log("Comprobado actualización lista " + list.listId);
                    });
                });
            });

            //Devuelvo bien desde aquí?
            return resolve(null);
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
                    // console.log(itemsMapped);
        
                    //Insertamos las canciones en la tabla de detalle de lista
                    List.insertMany({
                        listId: listId,
                        nameYT: playlistInfo.items[0].snippet.title,
                        etag: playlistItems.etag, //Revisar si esto va bien.
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
        
        checkUpdatedAll: checkUpdatedAll
    }
};