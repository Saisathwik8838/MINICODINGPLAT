import { Router } from 'express';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

// Protect all routes and restrict to admins globally
router.use(protect);
router.use(restrictTo('ADMIN'));

// Users
router.get('/users', adminController.getAllUsers);

// Problems
router.post('/problems', adminController.createProblem);
router.patch('/problems/:problemId', adminController.updateProblem);
router.delete('/problems/:problemId', adminController.deleteProblem);
router.post('/problems/:problemId/testcases', adminController.createTestCase);

export default router;
