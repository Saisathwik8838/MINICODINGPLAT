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

export const getAllDiscussions = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, sort = 'top' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const orderBy = sort === 'recent' 
            ? [{ createdAt: 'desc' }] 
            : [{ upvotes: 'desc' }, { createdAt: 'desc' }];

        const [discussions, total] = await Promise.all([
            prisma.discussion.findMany({
                skip,
                take: limitNum,
                orderBy,
                include: {
                    user: { select: { username: true } },
                    problem: { select: { title: true, slug: true, difficulty: true } },
                    _count: { select: { comments: true } }
                }
            }),
            prisma.discussion.count()
        ]);

        const formatted = discussions.map(d => ({
            id: d.id,
            title: d.title,
            contentPreview: d.content.substring(0, 120),
            author: d.user.username,
            problemId: d.problemId,
            problem: d.problem, // keeping title/slug inside
            upvotes: d.upvotes,
            commentCount: d._count.comments,
            tags: [], // Tags aren't in schema, mocking it
            createdAt: d.createdAt
        }));

        res.status(200).json({
            status: 'success',
            data: {
                discussions: formatted,
                pagination: {
                    total,
                    page: pageNum,
                    totalPages: Math.ceil(total / limitNum)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

