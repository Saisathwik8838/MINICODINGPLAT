import Redis from 'ioredis';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';

const redis = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
});

const createSlidingWindowLimiter = (limit, windowInSeconds) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return next(new AppError('Unauthorized access to rate limiter', 401));
            }

            const userId = req.user.userId;
            const routePath = req.baseUrl + req.path;
            const key = `ratelimit:${routePath}:${userId}`;
            const now = Date.now();
            const windowStart = now - (windowInSeconds * 1000);

            const multi = redis.multi();
            multi.zremrangebyscore(key, '-inf', windowStart);
            multi.zcard(key);
            multi.zadd(key, now, `${now}-${Math.random()}`);
            multi.expire(key, windowInSeconds);

            const results = await multi.exec();
            
            // zcard is the 2nd command, results[1] -> [error, count]
            const requestCount = results[1][1];

            if (requestCount >= limit) {
                return next(new AppError(`Rate limit exceeded. Try again in ${windowInSeconds} seconds.`, 429));
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

export const submissionLimiter = createSlidingWindowLimiter(5, 60);
export const runLimiter = createSlidingWindowLimiter(10, 60);
