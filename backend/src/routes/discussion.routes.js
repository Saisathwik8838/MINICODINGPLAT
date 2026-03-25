import { Router } from 'express';
import * as discussionController from '../controllers/discussion.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

// ---- Standalone Global Router ----
export const standaloneDiscussionRoutes = Router();
standaloneDiscussionRoutes.get('/', discussionController.getAllDiscussions);

// ---- Nested Problem Router ----
const router = Router({ mergeParams: true });
// mergeParams required if we mount this as /api/v1/problems/:problemId/discussions

// GET routes (Public)
router.get('/', discussionController.getDiscussions);
router.get('/:discussionId/comments', discussionController.getComments);

// POST requests (Protected)
router.use(protect);
router.post('/', discussionController.createDiscussion);
router.post('/:discussionId/upvote', discussionController.upvoteDiscussion);
router.post('/:discussionId/comments', discussionController.addComment);

export default router;
