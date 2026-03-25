import { Queue } from 'bullmq';
import { env } from './env.js';

export const submissionQueue = new Queue('submission-queue', {
    connection: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
    },
});
