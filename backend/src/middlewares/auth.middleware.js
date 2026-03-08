import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from './errorHandler.js';
import { prisma } from '../config/db.js';

export const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(new AppError('You are not logged in! Please log in to get access.', 401));
        }

        const decoded = verifyAccessToken(token);

        const currentUser = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, role: true },
        });

        if (!currentUser) {
            return next(new AppError('The user belonging to this token does no longer exist.', 401));
        }

        req.user = decoded;
        next();
    } catch (error) {
        next(new AppError('Invalid or expired token', 401));
    }
};

export const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
};
