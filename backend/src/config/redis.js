import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Redis connection with proper error handling
 */
export const redisConnection = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined, // ioredis requires undefined for no password
    db: env.REDIS_DB || 0,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: true,
    enableOfflineQueue: true,
    retryStrategy: (times) => {
        // Exponential backoff: 1s, 2s, 4s, 8s... max 30s
        const delay = Math.min(Math.pow(2, times - 1) * 1000, 30000);
        logger.warn(`Redis reconnection attempt ${times}, delay: ${delay}ms`);
        return delay;
    },
    lazyConnect: false
});

/**
 * Redis connection event handlers
 */
redisConnection.on('connect', () => {
    logger.info('Redis connection established');
});

redisConnection.on('ready', () => {
    logger.info('Redis connection ready for commands');
});

redisConnection.on('error', (err) => {
    logger.error(`Redis connection error: ${err.message}`, { stack: err.stack });
});

redisConnection.on('reconnecting', () => {
    logger.warn('Redis attempting to reconnect...');
});

redisConnection.on('close', () => {
    logger.warn('Redis connection closed');
});

// Ensure connection closes gracefully on process exit
process.on('exit', () => {
    redisConnection.disconnect();
});
