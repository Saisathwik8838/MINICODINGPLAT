import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';

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

app.use(helmet());
app.use(
    cors({
        origin: env.FRONTEND_URL,
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

if (env.NODE_ENV === 'production') {
    const __dirname = path.resolve();
    // Assuming backend is launched from backend/ folder, so frontend is at ../frontend/dist
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../frontend/dist', 'index.html'));
    });
} else {
    app.all('*', (req, res, next) => {
        res.status(404).json({ message: `Route ${req.originalUrl} not found` });
    });
}

app.use(errorHandler);

export default app;
