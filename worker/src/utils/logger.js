import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { env } from '../config/env.js';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${stack || message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});

const jsonFormat = combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
);

export const logger = winston.createLogger({
    level: env.NODE_ENV === 'development' ? 'debug' : 'info',
    format: jsonFormat,
    defaultMeta: { service: 'minileetcode-worker' },
    transports: [
        new winston.transports.Console({
            format: env.NODE_ENV === 'development'
                ? combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), colorize(), consoleFormat)
                : jsonFormat
        }),

        new DailyRotateFile({
            filename: 'logs/worker-error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'error',
        }),

        new DailyRotateFile({
            filename: 'logs/worker-combined-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
        })
    ],
});
