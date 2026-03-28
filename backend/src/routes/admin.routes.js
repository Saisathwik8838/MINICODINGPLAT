import { Router } from 'express';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import * as adminController from '../controllers/admin.controller.js';
import * as testCaseGenController from '../controllers/testCaseGenerator.controller.js';
import * as lcImportController from '../controllers/leetcodeImport.controller.js';

const router = Router();

// Protect all routes and restrict to admins globally
router.use(protect);
router.use(restrictTo('ADMIN'));

// Stats
router.get('/stats', adminController.getStats);

// Users
router.get('/users', adminController.getAllUsers);
router.patch('/users/:userId/role', adminController.updateUserRole);

// Problems
router.get('/problems', adminController.getAllProblems);
router.post('/problems', adminController.createProblem);
router.patch('/problems/:problemId', adminController.updateProblem);
router.delete('/problems/:problemId', adminController.deleteProblem);
router.get('/problems/:problemId/testcases', adminController.getTestCases);
router.post('/problems/:problemId/testcases', adminController.createTestCase);
router.delete('/problems/:problemId/testcases/:testCaseId', adminController.deleteTestCase);

// Generators
router.post('/problems/:problemId/generate-testcases', testCaseGenController.generateTestCases);
router.post('/problems/:problemId/regenerate-testcases', testCaseGenController.regenerateTestCases);

// LeetCode Datasets Import
router.get('/leetcode/stats', lcImportController.getStats);
router.post('/leetcode/preview', lcImportController.previewImport);
router.post('/leetcode/import', lcImportController.importTrain);
router.post('/leetcode/import-test', lcImportController.importTest);
router.post('/leetcode/import-single', lcImportController.importSingle);

// Submissions
router.get('/submissions', adminController.getAllSubmissions);

export default router;
