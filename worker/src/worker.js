import { Worker, QueueEvents } from 'bullmq';
import { redisConnection } from './config/redis.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { processSubmission } from './jobs/submissionProcessor.js';
import express from 'express';
import client from 'prom-client';

// ---- Prometheus Metrics Setup ----
client.collectDefaultMetrics();
const jobsProcessedCounter = new client.Counter({
    name: 'worker_jobs_processed_total',
    help: 'Total number of successfully processed code execution jobs'
});
const jobsFailedCounter = new client.Counter({
    name: 'worker_jobs_failed_total',
    help: 'Total number of failed code execution jobs'
});

const metricsApp = express();
metricsApp.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});

const METRICS_PORT = 5001;
const metricsServer = metricsApp.listen(METRICS_PORT, () => {
    logger.info(`📊 Worker Metrics Server listening on port ${METRICS_PORT}`);
});
// ----------------------------------

const submissionWorker = new Worker(
    env.QUEUE_NAME,
    async (job) => {
        return await processSubmission(job);
    },
    {
        connection: redisConnection,
        concurrency: env.WORKER_CONCURRENCY,
        lockDuration: 300000, // 5 minutes (allows for many sequential test cases)
    }
);

const queueEvents = new QueueEvents(env.QUEUE_NAME, {
    connection: redisConnection,
});

queueEvents.on('completed', ({ jobId }) => {
    logger.info(`Job ${jobId} completed successfully.`);
    jobsProcessedCounter.inc();
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error(`Job ${jobId} failed with reason: ${failedReason}`);
    jobsFailedCounter.inc();
});

submissionWorker.on('ready', () => {
    logger.info(`🚀 Worker started and listening to queue: [${env.QUEUE_NAME}] with concurrency ${env.WORKER_CONCURRENCY}`);
});

submissionWorker.on('error', (err) => {
    logger.error(`Worker Error: ${err.message}`);
});

const shutdown = async () => {
    logger.info('Shutting down worker gracefully...');
    await submissionWorker.close();
    await queueEvents.close();
    metricsServer.close();
    redisConnection.disconnect();
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
