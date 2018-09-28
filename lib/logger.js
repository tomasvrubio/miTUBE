const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;

//Log levels: { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
//TODO: Crear variable de entorno para el nivel de trazas que deseo.
const level = process.env.LOG_LEVEL || 'debug';


const myFormat = printf(info => {
    return `${info.timestamp} [${info.level}]: ${info.message}`;
});


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
        level: level,
        format: combine(
            format.colorize(),
            timestamp(),
            format.printf(info => { return JSON.stringify(info) }),
            //errorStackFormat,
            myFormat
        ),
    },
  };

const logger = createLogger({
    transports: [
        new transports.Console(options.console),
    ]
});

module.exports = logger;