import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (err, req, res, next) => {
    let statusCode = 500;
    let message = 'Internal Server Error';

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    } else {
        logger.error(`Unexpected Error: ${err.message}`, { stack: err.stack, path: req.path });
    }

    res.status(statusCode).json({
        status: 'error',
        statusCode,
        message,
        ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
