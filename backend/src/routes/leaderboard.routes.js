import { Router } from 'express';
import { getLeaderboard } from '../controllers/leaderboard.controller.js';

const router = Router();

// Publicly accessible leaderboard
router.get('/', getLeaderboard);

export default router;
