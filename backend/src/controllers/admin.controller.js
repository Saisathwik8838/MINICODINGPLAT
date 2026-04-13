import { prisma } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
// ---- Problems Management ----

export const createProblem = async (req, res, next) => {
    try {
        const { title, slug, description, difficulty, timeLimit, memoryLimit, isActive } = req.body;

        if (!title || !slug || !description || !difficulty) {
            throw new AppError('Missing required problem fields', 400);
        }

        const problem = await prisma.problem.create({
            data: {
                title,
                slug,
                description,
                difficulty,
                timeLimit: timeLimit || 5.0,
                memoryLimit: memoryLimit || 256,
                isActive: isActive !== undefined ? isActive : true,
            }
        });

        res.status(201).json({ status: 'success', data: { problem } });
    } catch (error) {
        if (error.code === 'P2002') return next(new AppError('Slug or Title must be unique', 400));
        next(error);
    }
};

export const createTestCase = async (req, res, next) => {
    try {
        const { problemId } = req.params;
        const { input, expectedOutput, isHidden, order } = req.body;

        const problem = await prisma.problem.findUnique({ where: { id: problemId } });
        if (!problem) throw new AppError('Problem not found', 404);

        const testCase = await prisma.testCase.create({
            data: { problemId, input, expectedOutput, isHidden, order: order || 0 }
        });

        res.status(201).json({ status: 'success', data: { testCase } });
    } catch (error) {
        next(error);
    }
};

export const updateProblem = async (req, res, next) => {
    try {
        const { problemId } = req.params;
        const updates = req.body;

        const problem = await prisma.problem.update({
            where: { id: problemId },
            data: updates
        });

        res.status(200).json({ status: 'success', data: { problem } });
    } catch (error) {
        next(error);
    }
};

export const deleteProblem = async (req, res, next) => {
    try {
        const { problemId } = req.params;

        await prisma.problem.delete({ where: { id: problemId } });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

// ---- Users Management ----

export const getAllUsers = async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                totalSolved: true,
                totalScore: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({ status: 'success', data: { users, count: users.length } });
    } catch (error) {
        next(error);
    }
};

export const updateUserRole = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!['USER', 'ADMIN'].includes(role)) {
            return next(new AppError('Invalid role. Must be USER or ADMIN.', 400));
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { role },
            select: { id: true, username: true, role: true }
        });

        res.status(200).json({ status: 'success', data: { user } });
    } catch (error) {
        next(error);
    }
};

export const getStats = async (req, res, next) => {
    try {
        const [totalUsers, totalProblems, totalSubmissions] = await Promise.all([
            prisma.user.count(),
            prisma.problem.count(),
            prisma.submission.count(),
        ]);

        res.status(200).json({
            status: 'success',
            data: { 
                totalUsers, 
                totalProblems, 
                totalSubmissions, 
                queueStatus: 0 
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getTestCases = async (req, res, next) => {
    try {
        const { problemId } = req.params;

        const testCases = await prisma.testCase.findMany({
            where: { problemId },
            orderBy: { order: 'asc' }
        });

        res.status(200).json({ status: 'success', data: { testCases } });
    } catch (error) {
        next(error);
    }
};

export const deleteTestCase = async (req, res, next) => {
    try {
        const { testCaseId } = req.params;

        await prisma.testCase.delete({
            where: { id: testCaseId }
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

export const getAllSubmissions = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const [submissions, total] = await Promise.all([
            prisma.submission.findMany({
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { username: true } },
                    problem: { select: { title: true } }
                }
            }),
            prisma.submission.count()
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

export const getAllProblems = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const where = search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } }
          ]
        } : {};

        const [problems, total] = await Promise.all([
            prisma.problem.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: {
                            submissions: true
                        }
                    }
                }
            }),
            prisma.problem.count({ where })
        ]);

        res.status(200).json({
            status: 'success',
            data: {
                problems,
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

