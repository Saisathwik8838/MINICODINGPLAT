import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',

    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/minileetcode?schema=public',

    REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
    REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',

    QUEUE_NAME: process.env.QUEUE_NAME || 'submission-queue',
    WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
};
