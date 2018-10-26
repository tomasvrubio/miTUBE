var youtube = require('youtube-api'),
  logger = require('../lib/logger');

module.exports = function () {
  function playlistInfoRecursive(playlistId, callStackSize, pageToken, currentItems, customRequestAmount, callback) {
    youtube.playlistItems.list({
      part: 'snippet',
      pageToken: pageToken,
      maxResults: (customRequestAmount > 50 || !customRequestAmount ? 50 : customRequestAmount),
      playlistId: playlistId,
    }, function (err, data) {
      if (err) return callback(err);
      for (const x in data.items) {
        currentItems.push(data.items[x].snippet);
      }
      if (data.nextPageToken && (customRequestAmount > 50 || !customRequestAmount)) {
        playlistInfoRecursive(playlistId, callStackSize + 1, data.nextPageToken, currentItems, (customRequestAmount > 50 ? customRequestAmount - 50 : customRequestAmount), callback);
      } else {
        callback(null, currentItems);
      }
    });
  }

  function playlistData(playlistId, callback) {
    youtube.playlists.list({
      part: 'snippet',
      maxResults: 50,
      id: playlistId,
      pageToken: null,
    }, function (err, data) {
      if (err) return callback(err);
      callback(null, data);
    });
  }

  function playlistEtag(playlistId, callback) {
    youtube.playlistItems.list({
      part: 'id',
      playlistId: playlistId,
      pageToken: null,
    }, function (err, data) {
      if (err) return callback(err);
      callback(null, data.etag);
    });
  }

  return {
    listItems: function (apiKey, playlistId, options) {
      //console.log("Consigo info sobre las canciones de la lista");
      return new Promise((resolve, reject) => {
        if (!apiKey)
          return reject(new Error('No API Key Provided'));
        if (!playlistId)
          return reject(new Error('No Playlist ID Provided'));
        if (!options)
          options = {};
        youtube.authenticate({
          type: 'key',
          key: apiKey
        });
        playlistInfoRecursive(playlistId, 0, null, [], options.maxResults || null, (err, list) => {
          if (err) return reject(err);
          return resolve(list);
        });
      });
    },
    listInfo: function (apiKey, playlistId, options) {
      //console.log("Consigo info de la lista");
      return new Promise((resolve, reject) => {
        if (!apiKey) return reject(new Error('No API Key Provided'));
        if (!playlistId) return reject(new Error('No Playlist ID Provided'));
        if (!options) options = {};
        youtube.authenticate({
          type: 'key',
          key: apiKey
        });
        playlistData(playlistId, (err, data) => {
          if (err) return reject(err);
          return resolve(data);
        });
      });
    },

    listEtag: function (apiKey, playlistId) {
      return new Promise((resolve, reject) => {
        if (!apiKey) return reject(new Error('No API Key Provided'));
        if (!playlistId) return reject(new Error('No Playlist ID Provided'));
        youtube.authenticate({
          type: 'key',
          key: apiKey
        });
        playlistEtag(playlistId, (err, etag) => {
          if (err) return reject(err);
          return resolve(etag);
        });
      });
    }
  }
};