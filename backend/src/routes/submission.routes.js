import { Router } from 'express';
import * as submissionController from '../controllers/submission.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all submission routes
router.use(protect);

router.post('/', submissionController.createSubmission);

router.get('/', submissionController.getUserSubmissions);
router.get('/:id', submissionController.getSubmission);

export default router;
