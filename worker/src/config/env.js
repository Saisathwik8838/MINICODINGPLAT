import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Validates that a required environment variable exists
 * @param {string} key - Environment variable name
 * @param {string} context - Where this is used (for error message)
 * @throws {Error} If variable is missing in production
 */
const requireEnvVar = (key, context = '') => {
    const value = process.env[key];
    if (!value && process.env.NODE_ENV === 'production') {
        throw new Error(
            `CRITICAL: Environment variable "${key}" is required in production${context ? ` (${context})` : ''}. ` +
            `Please set it via environment or .env file.`
        );
    }
    return value;
};

const nodeEnv = process.env.NODE_ENV || 'development';
if (nodeEnv === 'production') {
    requireEnvVar('DATABASE_URL', 'Prisma database connection');
    requireEnvVar('REDIS_HOST', 'Redis queue connection');
}

export const env = {
    // Core configuration
    NODE_ENV: nodeEnv,
    
    // Database configuration
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/minileetcode?schema=public',
    
    // Redis configuration
    REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
    REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
    REDIS_DB: parseInt(process.env.REDIS_DB || '0', 10),
    
    // Queue configuration
    QUEUE_NAME: process.env.QUEUE_NAME || 'submission-queue',
    WORKER_CONCURRENCY: Math.max(1, Math.min(20, parseInt(process.env.WORKER_CONCURRENCY || '5', 10))),
    

};

console.log(`[ENV] Starting in ${nodeEnv} mode`);
console.log(`[ENV] Queue concurrency: ${env.WORKER_CONCURRENCY}`);
