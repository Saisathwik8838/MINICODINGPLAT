import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.BACKEND_PORT || '5000', 10),

    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/minileetcode?schema=public',

    REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
    REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',

    JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_development_only',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'super_secret_refresh_key_development_only',
    REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',

    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};
