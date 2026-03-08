import app from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
    logger.info(`✨ Backend Server is running in ${env.NODE_ENV} mode on http://localhost:${PORT}`);
});

process.on('uncaughtException', (err) => {
    logger.error(`UNCAUGHT EXCEPTION! Shutting down... ${err.name}: ${err.message}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error(`UNHANDLED REJECTION! Shutting down... ${reason.name}: ${reason.message}`);
    server.close(() => {
        process.exit(1);
    });
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully.');
    server.close(() => {
        logger.info('Process terminated.');
    });
});
