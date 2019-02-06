var List = require('../models/list.js'),
  ListUser = require('../models/listUser.js'),
  WorkTodo = require('../models/workTodo.js'),
  Youtube = require('./youtube.js')(),
  logger = require('../lib/logger'),
  fs = require('fs');

module.exports = function () {
  function getListDiferences(apiKey, listId, newEtag) {
    //Se encarga de revisar que canciones se han modificado en la lista de YT. Podemos tener canciones que ya no estén o canciones nuevas.    
    return new Promise((resolve, reject) => {
      Promise.all([
        Youtube.listItems(apiKey, listId),
        List.findOne({
          listId: listId
        })
      ]).then(([newList, oldList]) => {
        var newListSongs = newList.map(function (item) {
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

        //Songs to delete
        if (deletedSongs.length) {
          generateWorkDelete(listId, deletedSongs).then(returnObject => {
            logger.debug(listId + " - Deleted songs inserted in WorkTodo");

            List.findOneAndUpdate({
                listId: listId
              }, {
                $pull: {
                  songs: {
                    songId: {
                      $in: deletedSongs
                    }
                  }
                }
              }, {
                multi: true
              },
              function (err) {
                if (err) {
                  logger.error(listId + " - Can't extract songs from List");
                  return reject(err.stack);
                }
                logger.debug(listId + " - Songs deleted: " + deletedSongs.length);
              }
            );

          }).catch(err => {
            logger.error(listId + " - Can't insert songs in WorkTodo");
            return reject(err.stack);
          });
        }

        //Songs to upload
        var insertList = newListSongs.filter(x => newSongs.includes(x.songId));
        List.findOneAndUpdate({
            listId: listId
          }, {
            $set: {
              etag: newEtag,
              updated: Date.now(),
              modified: Date.now()
            },
            $push: {
              songs: insertList
            }
          }, {
            multi: true
          },
          function (err) {
            if (err) {
              logger.error(listId + " - Can't insert songs in List");
              return reject(err.stack);
            }

            logger.debug(listId + " - Songs added: " + newSongs.length);

            generateWorkUpload(listId).then(returnObject => {
              logger.debug(listId + " - Upload songs inserted in WorkTodo");
            }).catch(err => {
              logger.error(listId + " - Can't insert songs in WorkTodo");
              return reject(err.stack);
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

      if (!apiKey || !listId)
        return reject(new Error("No Parameters Provided"));

      Promise.all([
        Youtube.listEtag(apiKey, listId),
        List.findOne({
          listId: listId
        })
      ]).then(([newEtag, list]) => {
        if (list.etag != newEtag) {
          logger.debug(listId + " - Etag modified. List update necesary");
          getListDiferences(apiKey, listId, newEtag).then(returnObject => {
            return resolve(null);
          }).catch(err => {
            return reject(err.stack);
          });
        } else {
          logger.debug(listId + " - Etag not modified. List allready updated");

          list.updated = Date.now();
          list.save();
          return resolve(null);
        }
      }).catch(err => {
        return reject(err.stack);
      });
    });
  }

  //Comprueba todas las listas del usuario.
  function checkUpdatedUser(apiKey, email) {
    return new Promise((resolve, reject) => {
      logger.debug(email + " - Check the lists of the user");

      if (!apiKey || !email)
        return reject(new Error("No Parameters Provided"));

      ListUser.find({
        email: email,
        sync: true
      }, function (err, lists) {
        if (err) return reject(err.stack);

        lists.forEach(function (list, index) {
          checkUpdatedList(apiKey, list.listId).then(returnObject => {
            logger.debug(list.listId + " - List checked");
            if (index == lists.length - 1)
              return resolve(null);
          }).catch(err => {
            return reject(err.stack);
          });
        });
      });
    });
  }

  //Comprueba todas las listas registradas en la aplicación.
  function checkUpdatedAll(apiKey) {
    return new Promise((resolve, reject) => {
      logger.info("Checking all the list in the DB");

      if (!apiKey)
        return reject(new Error("No Parameters Provided"));

      List.find({}, function (err, lists) {
        if (err) return reject(err.stack);

        lists.forEach(function (list, index) {
          checkUpdatedList(apiKey, list.listId).then(returnObject => {
            logger.debug(list.listId + " - Checked list updates");
            if (index == lists.length - 1)
              return resolve(null);
          }).catch(err => {
            return reject(err.stack);
          });
        });
      });
    });
  }

  //Carga en workTodo todo aquello que haya que subir a googleMusic
  function generateWorkUpload(listId) {
    return new Promise((resolve, reject) => {
      Promise.all([
        List.findOne({
          listId: listId
        }),
        ListUser.find({
          listId: listId
        })
      ]).then(([list, relations]) => {
        relations.forEach(function (relation, index) {
          if (relation.updated == null)
            var newSongs = list.songs;
          else
            var newSongs = list.songs.filter(song => song.added > relation.updated);

          logger.debug(relation.email + " - Songs for new work:");
          logger.debug(JSON.stringify(newSongs));

          var upWorks = newSongs.map(function (song) {
            return {
              songId: song.songId,
              listId: listId,
              listName: relation.name,
              imageId: relation.imageId,
              email: relation.email,
              state: "new",
              dateLastMovement: Date.now(),
            }
          });

          //Para meter un array tiene que ir sin "{}"
          WorkTodo.insertMany(upWorks, function (err) {
            if (err) return reject(err.stack);

            relation.updated = Date.now();
            relation.save(function (err) {
              if (err) return reject(err.stack);
            });
          });

          if (index == relations.length - 1)
            return resolve(null);
        });
      }).catch(err => {
        return reject(err.stack);
      });
    });
  }

  //Carga en workTodo todo aquello que haya que eliminar de googleMusic
  function generateWorkDelete(listId, deleted) {
    return new Promise((resolve, reject) => {
      Promise.all([
        List.findOne({
          listId: listId
        }),
        ListUser.find({
          listId: listId
        })
      ]).then(([list, relations]) => {
        var deletedSongs = list.songs.filter(x => deleted.includes(x.songId));

        logger.debug("Songs for 'del' work:");
        logger.debug(JSON.stringify(deletedSongs));

        relations.forEach(function (relation, index) {

          var delWorks = deletedSongs.map(function (song) {
            return {
              songId: song.songId,
              gmusicId: song.gmusicId,
              listId: listId,
              listName: relation.name,
              email: relation.email,
              state: "del",
              dateLastMovement: Date.now(),
            }
          });

          //Para meter un array tiene que ir sin "{}"
          WorkTodo.insertMany(delWorks, function (err) {
            if (err) return reject(err.stack);

            relation.save(function (err) {
              if (err) return reject(err.stack);
            });
          });

          if (index == relations.length - 1)
            return resolve(null);
        });
      }).catch(err => {
        return reject(err.stack);
      });
    });
  }

  //Elimina toda información de la lista de la BBDD
  function deleteList(listId) {
    return new Promise((resolve, reject) => {
        
      List.deleteOne({listId}, function(err) {
        if (err)
          return reject(err.stack);

        return resolve(null);
      });

    });
  }


  return {
    createRelation: function (apiKey, listId, listName, email) {
      //Inserta registro en BBDD ListUser para asociar la lista con el usuario.
      return new Promise((resolve, reject) => {
        Youtube.listInfo(apiKey, listId).then(playlistInfo => {

          //En caso de que sea una lista válida de Youtube
          if (playlistInfo.pageInfo.totalResults == 1) {
            ListUser.insertMany({
              listId: listId,
              name: listName,
              email: email,
              created: Date.now()
            }, function (err) {
              if (err) {
                logger.debug(listId + " - " + email + " - Can't save relation in DB");
                return reject(err.stack);
              }
              logger.debug(listId + " - " + email + " - Relation created");
              return resolve(playlistInfo.items[0].snippet.title);
            });
          } else {
            logger.debug("Invalid youtube URL");
            return reject(new Error("Invalid youtube URL"));
          }
        }).catch(err => {
          return reject(err.stack);
        });
      });
    },

    deleteRelation: function (email, listId) {
      return new Promise((resolve, reject) => {
        Promise.all([
          List.findOne({    //Get delete songs
            listId: listId
          }),
          ListUser.find({   //Get users atached to list
            listId: listId
          }).count()
        ]).then(([list, relations]) => {
          var songsDelete = list.songs.map(song => song.songId);
          
          //Generate delete work
          if (songsDelete.length) {
            generateWorkDelete(listId, songsDelete).then(returnObject => {
              logger.debug(listId + " - Deleted songs inserted in WorkTodo");

              //Delete relation for the user
              ListUser.deleteOne({listId, email}, function(err) {
                if (err){
                  logger.error(listId + " - Can't delete relation");
                }

                logger.debug(listId + " - Relation deleted with user "+email);
              });

              //Delete list if necesary (no more people have it)
              if (relations == 1) {
                deleteList(listId).then(returnObject => {
                  logger.debug(listId + " - List deleted");
                }).catch(err => {
                  logger.error(listId + " - Can't delete list");
                });
              }

            }).catch(err => {
              logger.error(listId + " - Can't insert songs in WorkTodo");
              return reject(err.stack);
            });
          }

          return resolve(null);
        }).catch(err => {
          return reject(err.stack);
        });
      });
    },

    createList: function (apiKey, listId, nameYT) {
      //Genera lista en tabla e inserta las canciones sin comprobar las existentes (son todas nuevas).
      return new Promise((resolve, reject) => {
        List.findOne({
          listId: listId
        }, function (err, list) {
          if (err) {
            logger.debug(listId + " - Can't search list");
            return reject(err.stack);
          }

          if (list != null) {
            logger.debug("Existing list. Only need to chek songs for all users.");
            checkUpdatedList(apiKey, listId);
            return resolve(listId);
          }

          Youtube.listItems(apiKey, listId).then(playlistItems => {
            var itemsMapped = playlistItems.map(function (item) {
              return {
                songId: item.resourceId.videoId,
                originalName: item.title,
                added: item.publishedAt
              }
            });

            List.insertMany({
              listId: listId,
              nameYT: nameYT,
              etag: playlistItems.etag,
              updated: Date.now(),
              modified: Date.now(),
              songs: itemsMapped
            }, function (err) {
              if (err) {
                logger.debug(listId + " - List details not saved to DB");
                return reject(err.stack);
              }
              return resolve(listId);
            });
          });
        });
      });
    },

    toogleSync: function (email, listId, sync) {
      ListUser.findOneAndUpdate({ 
        email,
        listId
      }, {
        $set: {
          sync
        }
      }, function (err) {
        logger.debug("User " + email + " put list " + listId + " sync to " + sync);

        return;
      });
    },

    setImage: function(email, listId, listName, songId, imageId) {
      return new Promise((resolve, reject) => {
        ListUser.findOneAndUpdate({ 
          email,
          listId
        }, {
          $set: {
            imageId
          }
        }, function (err) {
          if (err) return reject(err.stack);

          WorkTodo.insertMany({
            listId, 
            email,
            imageId,
            songId,
            name: listName,
            state: "img",
            dateLastMovement: Date.now(),
          });
          
          logger.debug("User " + email + "change imageId " + imageId +  " to list " + listId);
          return resolve(null);
        });
      });
    },

    getImages: function() {
      return new Promise((resolve, reject) => {
        fs.readdir("public/img/covers", (err, files) => {
          if (err) return reject(err.stack);

          const images = files.filter(file => file != "thumbnail");

          return resolve(images);
        });
      });
    },

    checkUpdatedList: checkUpdatedList,

    checkUpdatedUser: checkUpdatedUser,

    checkUpdatedAll: checkUpdatedAll,

    generateWorkUpload: generateWorkUpload,

    generateWorkDelete: generateWorkDelete,
  }
};