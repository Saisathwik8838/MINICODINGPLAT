import { prisma } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { submissionQueue } from '../config/queue.js';

export const createSubmission = async (req, res, next) => {
    try {
        const { code, language, problemId, isRun } = req.body;
        const userId = req.user.userId;

        if (!code || !language || !problemId) {
            return next(new AppError('Please provide code, language, and problemId', 400));
        }

        const submission = await prisma.submission.create({
            data: {
                userId,
                problemId,
                language: language.toUpperCase(),
                code,
                status: 'PENDING',
            }
        });

        // Add to BullMQ Queue
        await submissionQueue.add('execute-code', {
            submissionId: submission.id,
            code,
            language: language.toUpperCase(),
            problemId,
            isRun: !!isRun // Boolean indicating if it's just a test run
        });

        res.status(202).json({
            status: 'success',
            data: { submissionId: submission.id }
        });
    } catch (error) {
        next(error);
    }
};

export const getSubmission = async (req, res, next) => {
    try {
        const { id } = req.params;

        const submission = await prisma.submission.findUnique({
            where: { id },
            include: {
                problem: { select: { title: true, slug: true } },
                user: { select: { username: true } }
            }
        });

        if (!submission) {
            return next(new AppError('Submission not found', 404));
        }

        res.status(200).json({
            status: 'success',
            data: { submission }
        });
    } catch (error) {
        next(error);
    }
};

export const getUserSubmissions = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { page = 1, limit = 20, problemId, status, language } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const where = { userId };

        if (problemId) where.problemId = problemId;
        if (status) where.status = status;
        if (language) where.language = language.toUpperCase();

        const [submissions, total] = await Promise.all([
            prisma.submission.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
                include: {
                    problem: { select: { title: true, slug: true } }
                }
            }),
            prisma.submission.count({ where })
        ]);

        res.status(200).json({
            status: 'success',
            data: {
                submissions,
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
