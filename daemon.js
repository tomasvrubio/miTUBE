var express = require('express'),
    favicon = require('express-favicon'),
    nodemailer = require('nodemailer'),
    flash = require('connect-flash'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    LocalStrategy = require('passport-local'),
    passportLocalMongoose = require('passport-local-mongoose'), //Revisar que es lo que utilizo realmente de passport
    moment = require('moment'),
    credentials = require('./credentials.js'), 
    List = require('./models/list.js'),
    ListUser = require('./models/listUser.js'),
    User = require('./models/user.js');
    //Utilizamos un fichero con las credenciales. Importante que no sincronice con el repositorio.

var Youtube = require('./lib/youtube.js')(),
    Synchronize = require('./lib/synchronize.js')(),
    Gmusic = require('./lib/gmusic.js')(),
    YoutubeDL = require('./lib/youtubedl.js')();

var active = 1;

const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function resolveAfter2Seconds(x) { 
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(x);
    }, 2000);
  });
}

do {
  console.log("Soy tu hijo y estoy aquí!!!");
  //sleep(2000); //Para esperar hasta que finalice una promesa.  
  var x = await resolveAfter2Seconds(10);
  console.log(x); 
} while (active);