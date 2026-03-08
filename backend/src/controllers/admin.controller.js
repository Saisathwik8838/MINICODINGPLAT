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
