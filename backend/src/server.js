import app from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { prisma } from './config/db.js';

const PORT = env.PORT || 5000;

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    
    server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
            await prisma.$disconnect();
            logger.info('Database disconnected');
        } catch (err) {
            logger.error(`Error disconnecting database: ${err.message}`);
        }
        
        logger.info('Process terminated gracefully');
        process.exit(0);
    });
    
    // Force shutdown after 30 seconds
    const forceExitTimer = setTimeout(() => {
        logger.error('Graceful shutdown timeout (30s), forcing exit');
        process.exit(1);
    }, 30000);
    
    forceExitTimer.unref();
};

/**
 * Start server
 */
const server = app.listen(PORT,'0.0.0.0', () => {
    logger.info(
        `✨ Backend Server is running in ${env.NODE_ENV} mode on http://0.0.0.0:${PORT}`
    );
    logger.info(`Database connected: ${env.DATABASE_URL?.substring(0, 50)}...`);
});

/**
 * Handle server errors
 */
server.on('error', (err) => {
    logger.error(`Server error: ${err.message}`, { code: err.code });
    if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
    }
    process.exit(1);
});

/**
 * Uncaught Exception Handler
 * Logs error and shuts down
 */
process.on('uncaughtException', (err) => {
    logger.error(
        `UNCAUGHT EXCEPTION: ${err.name}: ${err.message}`,
        { stack: err.stack }
    );
    logger.error('Application must restart');
    
    gracefulShutdown('uncaughtException');
});

/**
 * Unhandled Rejection Handler
 * Some rejections might not have name/message properties
 */
process.on('unhandledRejection', (reason, promise) => {
    let errorMessage = 'Unknown error';
    
    if (reason instanceof Error) {
        errorMessage = `${reason.name}: ${reason.message}`;
    } else if (typeof reason === 'string') {
        errorMessage = reason;
    } else {
        errorMessage = JSON.stringify(reason);
    }
    
    logger.error(
        `UNHANDLED REJECTION: ${errorMessage}`,
        { promise: promise.toString() }
    );
    
    gracefulShutdown('unhandledRejection');
});

/**
 * Shutdown Signals
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Handle warnings
 */
process.on('warning', (warning) => {
    logger.warn(`Process warning: ${warning.name}: ${warning.message}`);
});
