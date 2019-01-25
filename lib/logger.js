const {
  createLogger,
  format,
  transports
} = require('winston');

// var path = require("path");
// var fs = require("fs");
// var appRoot = require("app-root-path");
// var winston = require("winston");


var credentials = require('../credentials.js');

//Log levels: { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
const levelConsole = credentials.logger.levelConsole || 'debug',
      levelFile = credentials.logger.levelFile || 'info';


const myFormat = format.printf(info => {
  return `${info.timestamp} [${info.level}]: ${info.message}`;
});


var options = {
  file: {
    level: levelFile,
    filename: `logs/app_mitube.log`,
    datePattern: '.yyyy-MM-dd',
    handleExceptions: true,
    json: true,
    // maxsize: 5242880, // 5MB
    // maxFiles: 10,
    format: format.combine(
      format.colorize(),
      format.timestamp(),
      format.printf(info => {
        return JSON.stringify(info)
      }),
      //errorStackFormat,
      myFormat
    ),
  },
  console: {
    level: levelConsole,
    format: format.combine(
      format.colorize(),
      format.timestamp(),
      format.printf(info => {
        return JSON.stringify(info)
      }),
      //errorStackFormat,
      myFormat
    ),
  },
};

const logger = createLogger({
  transports: [
    new transports.Console(options.console),
    new transports.File(options.file),
  ]
});



// create a stream object with a 'write' function that will be used by `morgan`. This stream is based on node.js stream https://nodejs.org/api/stream.html.
logger.stream = {
  write: function(message, encoding) {
    // use the 'info' log level so the output will be picked up by both transports
    logger.info(message.substring(0,message.lastIndexOf('\n')));
  }
};

logger.combinedFormat = function(err, req, res) {
  // Similar combined format in morgan
  // :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"
  return `${req.ip} - - \"${req.method} ${req.originalUrl} HTTP/${req.httpVersion}\" ${err.status ||
    500} - ${req.headers["user-agent"]}`;
};




module.exports = logger;