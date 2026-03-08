import { prisma } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';

// Get all discussions for a specific problem
export const getDiscussions = async (req, res, next) => {
    try {
        const { problemId } = req.params;

        const discussions = await prisma.discussion.findMany({
            where: { problemId },
            include: {
                user: { select: { username: true, role: true } },
                _count: { select: { comments: true } }
            },
            orderBy: [
                { upvotes: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        res.status(200).json({ status: 'success', data: { discussions } });
    } catch (error) {
        next(error);
    }
};

// Create a new discussion post
export const createDiscussion = async (req, res, next) => {
    try {
        const { problemId } = req.params;
        const { title, content } = req.body;
        const userId = req.user.userId;

        if (!title || !content) {
            throw new AppError('Title and content are required', 400);
        }

        const discussion = await prisma.discussion.create({
            data: {
                title,
                content,
                userId,
                problemId
            },
            include: {
                user: { select: { username: true, role: true } }
            }
        });

        res.status(201).json({ status: 'success', data: { discussion } });
    } catch (error) {
        next(error);
    }
};

// Upvote a discussion post
export const upvoteDiscussion = async (req, res, next) => {
    try {
        const { discussionId } = req.params;

        const discussion = await prisma.discussion.update({
            where: { id: discussionId },
            data: { upvotes: { increment: 1 } },
            select: { id: true, upvotes: true }
        });

        res.status(200).json({ status: 'success', data: { discussion } });
    } catch (error) {
        next(error);
    }
};

// Add a comment to a discussion
export const addComment = async (req, res, next) => {
    try {
        const { discussionId } = req.params;
        const { content } = req.body;
        const userId = req.user.userId;

        if (!content) {
            throw new AppError('Comment content is required', 400);
        }

        const comment = await prisma.comment.create({
            data: {
                content,
                userId,
                discussionId
            },
            include: {
                user: { select: { username: true, role: true } }
            }
        });

        res.status(201).json({ status: 'success', data: { comment } });
    } catch (error) {
        next(error);
    }
};

// Get comments for a discussion
export const getComments = async (req, res, next) => {
    try {
        const { discussionId } = req.params;

        const comments = await prisma.comment.findMany({
            where: { discussionId },
            include: {
                user: { select: { username: true, role: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        res.status(200).json({ status: 'success', data: { comments } });
    } catch (error) {
        next(error);
    }
};
