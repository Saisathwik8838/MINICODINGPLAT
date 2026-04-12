import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Validates that a required environment variable exists
 * @throws {Error} If required variable missing in production
 */
const requireEnvVar = (key, context = '') => {
    const value = process.env[key];
    if (!value && process.env.NODE_ENV === 'production') {
        throw new Error(
            `CRITICAL: Environment variable "${key}" is required in production${context ? ` (${context})` : ''}`
        );
    }
    return value;
};

const nodeEnv = process.env.NODE_ENV || 'development';

if (nodeEnv === 'production') {
    requireEnvVar('DATABASE_URL', 'Database connection');
    requireEnvVar('JWT_SECRET', 'Authentication security');
    requireEnvVar('REFRESH_TOKEN_SECRET', 'Refresh token security');
}

export const env = {
    // Core configuration
    NODE_ENV: nodeEnv,
    PORT: parseInt(process.env.PORT || '5000', 10),
    
    // Security
    JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret-change-in-production',
    JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
    REFRESH_TOKEN_EXPIRE: process.env.REFRESH_TOKEN_EXPIRE || '30d',
    
    // Database
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/minileetcode?schema=public',
    
    // API Configuration
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    
    // Submission constraints
    MAX_CODE_SIZE_KB: parseInt(process.env.MAX_CODE_SIZE_KB || '100', 10),

    // Metrics & Monitoring
    METRICS_SECRET: process.env.METRICS_SECRET || '', // Empty = localhost only
};

console.log(`[ENV] Backend running in ${nodeEnv} mode on port ${env.PORT}`);
