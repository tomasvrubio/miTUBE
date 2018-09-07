var fs = require('fs'),
    List = require('../models/list.js'),
    ListUser = require('../models/listUser.js'),
    WorkTodo = require('../models/workTodo.js'),
    Youtube = require('./youtube.js')();

module.exports = function(){
    function getListDiferences(){

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
                        eTag: playlistItems.etag, //Revisar si esto va bien.
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

        checkUpdatedList: function(apiKey, listId, email) {

        },
        
        checkUpdatedUser: function(apiKey, email) {
        
        },

        checkUpdatedAll: function(apiKey) {
        
        },        
    }
};


//Hacer tres funciones con distintos niveles. Serán funciones visibles desde fuera. ¿Que función hago interna que me sirva para todo? Las querys a BBDD las haré en esta misma librería. También tengo que tener una función que sólo llamaré la primera vez que consiga la información sobre la lista.
//1 - Sincroniza las canciones en una lista [checkUpdatedList]
//2 - Sincroniza las listas de un usuario. Recorro las listas de un usuario y las mando a (1) [checkUpdatedUser]
//3 - Sincroniza las listas de todos los usuarios. Recorro cada usuario y lo mando a (2) [checkUpdatedAll]

//Además necesito las siguientes funciones:
//createRelation: Insertar en tabla de relacion listUser
//createList: Insertar canciones en primera ejecución en list

//checkEtag -- Esta ya la tengo hecha en synchronize
//getListDiferences