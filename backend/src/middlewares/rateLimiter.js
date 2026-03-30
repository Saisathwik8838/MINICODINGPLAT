import RedisStore from 'rate-limit-redis';
import rateLimit from 'express-rate-limit';
import { redisConnection } from '../config/redis.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * General API rate limiter
 * Limits requests per IP across all endpoints
 */
export const generalLimiter = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redisConnection.call(...args),
        prefix: 'rl:general:',
    }),

    windowMs: env.API_RATE_LIMIT_WINDOW_MS, // 15 minutes
    max: env.API_RATE_LIMIT_MAX_REQUESTS, // 100 requests
    message: {
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: env.API_RATE_LIMIT_WINDOW_MS / 1000
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip health and metrics endpoints
        return req.path === '/health' || req.path === '/metrics';
    },
    keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise IP
        return req.user?.id || req.ip;
    },
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
        res.status(429).json({
            error: 'Too Many Requests',
            message: 'You have exceeded the rate limit. Please try again later.',
            retryAfter: Math.ceil(env.API_RATE_LIMIT_WINDOW_MS / 1000)
        });
    },
    onLimitReached: (req, res, options) => {
        logger.warn(`Rate limit about to be reached for ${req.ip}`);
    }
});

/**
 * Strict rate limiter for submission endpoint
 * Prevents abuse of expensive code execution
 */
export const submissionLimiter = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redisConnection.call(...args),
        prefix: 'rl:submission:',
    }),

    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 submissions per minute per user
    message: {
        error: 'Too many submissions',
        message: 'You have submitted too many solutions. Please wait before submitting again.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Rate limit by user ID (required for this endpoint)
        return req.user?.id || req.ip;
    },
    handler: (req, res) => {
        logger.warn(`Submission rate limit exceeded for ${req.user?.id || req.ip}`);
        res.status(429).json({
            error: 'Submission Limit Exceeded',
            message: 'You are submitting too frequently. Please wait before trying again.',
            retryAfter: 60
        });
    }
});

/**
 * Login rate limiter
 * Prevents brute force attacks
 */
export const loginLimiter = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redisConnection.call(...args),
        prefix: 'rl:login:',
    }),

    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: {
        error: 'Too many login attempts',
        message: 'Too many login attempts. Please try again later.',
        retryAfter: 900
    },
    skipSuccessfulRequests: true, // Don't count successful logins
    keyGenerator: (req) => {
        // Rate limit by email (from request body) or IP
        return (req.body?.email || req.ip).toLowerCase();
    },
    handler: (req, res) => {
        logger.warn(`Login rate limit exceeded for ${req.body?.email || req.ip}`);
        res.status(429).json({
            error: 'Too Many Login Attempts',
            message: 'Too many login attempts. Please try again after 15 minutes.',
            retryAfter: 900
        });
    }
});

/**
 * Admin action rate limiter
 * Stricter for sensitive operations
 */
export const adminLimiter = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redisConnection.call(...args),
        prefix: 'rl:admin:',
    }),

    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 admin actions per minute
    message: {
        error: 'Admin action rate limit exceeded',
        message: 'Too many admin operations. Please wait before trying again.',
        retryAfter: 60
    },
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    },
    handler: (req, res) => {
        logger.warn(`Admin rate limit exceeded for ${req.user?.id || req.ip}`);
        res.status(429).json({
            error: 'Admin Rate Limit Exceeded',
            message: 'Too many admin operations. Please wait before trying again.',
            retryAfter: 60
        });
    }
});

/**
 * Basic rate limiter for RUN operations (different from actual submissions)
 */
export const runLimiter = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redisConnection.call(...args),
        prefix: 'rl:run:',
    }),

    windowMs: 60 * 1000,
    max: 20, // 20 runs per minute
    message: {
        error: 'Too many runs',
        message: 'You are running code too frequently. Please wait.',
        retryAfter: 60
    },
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    }
});

