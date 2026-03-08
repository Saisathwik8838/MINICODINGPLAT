import winston from 'winston';
import 'winston-daily-rotate-file';
import { env } from '../config/env.js';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Console format for human readability during development
const consoleFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${stack || message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});

// JSON format for machine readability (Elasticsearch/Splunk/Grafana Loki) in Production
const jsonFormat = combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
);

export const logger = winston.createLogger({
    level: env.NODE_ENV === 'development' ? 'debug' : 'info',
    format: jsonFormat, // Default internal format
    defaultMeta: { service: 'minileetcode-backend' },
    transports: [
        // Output everything to console, prettified if in dev, else structured JSON
        new winston.transports.Console({
            format: env.NODE_ENV === 'development'
                ? combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), colorize(), consoleFormat)
                : jsonFormat
        }),

        // Write all errors to a dedicated rotating file
        new winston.transports.DailyRotateFile({
            filename: 'logs/backend-error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'error',
        }),

        // Write ALL logs (Errors, Info, Warnings) to a combined rotating file
        new winston.transports.DailyRotateFile({
            filename: 'logs/backend-combined-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
        })
    ],
});
