import { prisma } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';

export const getProfile = async (req, res, next) => {
    try {
        const { username } = req.params;

        const user = await prisma.user.findUnique({
            where: { username },
            select: {
                id: true,
                username: true,
                createdAt: true,
                totalSolved: true,
                totalScore: true,
            }
        });

        if (!user) {
            return next(new AppError('User not found', 404));
        }

        // Fetch recent 10 submissions
        const recentSubmissions = await prisma.submission.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                problem: {
                    select: {
                        title: true,
                        slug: true,
                        difficulty: true
                    }
                }
            }
        });

        // Get solved problems grouped by difficulty using distinct submissions
        // So we need uniquely solved problems only
        const acceptedSubmissions = await prisma.submission.findMany({
            where: {
                userId: user.id,
                status: 'ACCEPTED'
            },
            distinct: ['problemId'],
            include: {
                problem: {
                    select: {
                        slug: true,
                        difficulty: true,
                        title: true
                    }
                }
            }
        });

        const solvedByDifficulty = {
            EASY: [],
            MEDIUM: [],
            HARD: []
        };

        acceptedSubmissions.forEach(sub => {
            if (solvedByDifficulty[sub.problem.difficulty]) {
                solvedByDifficulty[sub.problem.difficulty].push({
                    slug: sub.problem.slug,
                    title: sub.problem.title
                });
            }
        });

        res.status(200).json({
            status: 'success',
            data: {
                user,
                stats: {
                    solvedByDifficulty,
                    recentSubmissions
                }
            }
        });

    } catch (error) {
        next(error);
    }
};
