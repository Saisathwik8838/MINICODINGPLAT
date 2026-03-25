import { Router } from 'express';
import * as problemController from '../controllers/problem.controller.js';
import { verifyAccessToken } from '../utils/jwt.js';

const router = Router();

const optionalAuth = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
        try {
            req.user = verifyAccessToken(token);
        } catch (e) {
            // Invalid token, ignore
        }
    }
    next();
};

router.get('/', problemController.getProblems);
router.get('/:slug', optionalAuth, problemController.getProblemBySlug);

export default router;
