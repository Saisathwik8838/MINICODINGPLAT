import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

/**
 * Prisma database client with logging and error handling
 */
export const prisma = new PrismaClient({
    log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' }
    ]
});

/**
 * Log Prisma queries (in development only to avoid noise)
 */
if (process.env.NODE_ENV === 'development') {
    prisma.$on('query', (e) => {
        logger.debug(`Prisma Query: ${e.query}`, { duration: e.duration });
    });
}

/**
 * Log Prisma warnings
 */
prisma.$on('warn', (e) => {
    logger.warn(`Prisma Warning: ${e.message}`);
});

/**
 * Log Prisma errors
 */
prisma.$on('error', (e) => {
    logger.error(`Prisma Error: ${e.message}`, { target: e.target });
});

/**
 * Graceful shutdown: disconnect Prisma
 */
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, disconnecting Prisma...');
    await prisma.$disconnect();
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, disconnecting Prisma...');
    await prisma.$disconnect();
});
