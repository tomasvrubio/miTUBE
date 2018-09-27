var winston = require("winston");

//Log levels: { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
//TODO: Crear variable de entorno para el nivel de trazas que deseo.
const level = process.env.LOG_LEVEL || 'debug';

var options = {
    // file: {
    //   level: 'info',
    //   filename: `${appRoot}/logs/app.log`,
    //   handleExceptions: true,
    //   json: true,
    //   maxsize: 5242880, // 5MB
    //   maxFiles: 5,
    //   colorize: false,
    // },
    console: {
      level: 'debug',
      handleExceptions: true,
      json: false,
      colorize: true,
    },
  };

const logger = winston.createLogger({
    transports: [
        //new winston.transports.File(options.file),
        new winston.transports.Console(options.console)
      ],
      exitOnError: false, // do not exit on handled exceptions
  });

module.exports = logger;