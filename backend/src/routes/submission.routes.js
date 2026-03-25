import { Router } from 'express';
import * as submissionController from '../controllers/submission.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { submissionLimiter, runLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Protect all submission routes
router.use(protect);

router.post('/', (req, res, next) => {
    if (req.body.isRun) {
        return runLimiter(req, res, next);
    }
    return submissionLimiter(req, res, next);
}, submissionController.createSubmission);

router.get('/', submissionController.getUserSubmissions);
router.get('/:id', submissionController.getSubmission);

export default router;
