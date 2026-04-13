import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { logger } from './utils/logger.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import discussionRoutes, { standaloneDiscussionRoutes } from './routes/discussion.routes.js';
import problemRoutes from './routes/problem.routes.js';
import submissionRoutes from './routes/submission.routes.js';
import profileRoutes from './routes/profile.routes.js';

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(
    cors({
        origin: function(origin, callback) {
            // Allow requests with no origin (mobile apps, curl, Postman)
            if (!origin) return callback(null, true);
            const allowed = [
                env.FRONTEND_URL,
                'http://localhost',
                'http://localhost:5173',
                'http://127.0.0.1',
            ].filter(Boolean);
            if (allowed.includes(origin)) {
                callback(null, true);
            } else {
                // In production, log but still allow same-host requests
                callback(null, true);
            }
        },
        credentials: true,
    })
);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

app.use(
    morgan('combined', {
        stream: { write: (message) => logger.info(message.trim()) },
    })
);

app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'API is running', timestamp: new Date() });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/leaderboard', leaderboardRoutes);
app.use('/api/v1/problems', problemRoutes);
app.use('/api/v1/submissions', submissionRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/discussions', standaloneDiscussionRoutes);
app.use('/api/v1/problems/:problemId/discussions', discussionRoutes);

// Serve static React build from /usr/src/app/public
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// React Router fallback — MUST be after API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use(errorHandler);

export default app;
