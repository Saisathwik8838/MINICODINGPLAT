import { prisma } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { normalizeVisibleTestCases } from '../utils/testcaseInput.js';

export const getProblems = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, difficulty, search, countOnly } = req.query;

        if (countOnly === 'true') {
            const counts = await prisma.problem.groupBy({
                by: ['difficulty'],
                _count: {
                    id: true
                },
                where: { isActive: true }
            });

            const result = { EASY: 0, MEDIUM: 0, HARD: 0 };
            counts.forEach(c => {
                result[c.difficulty] = c._count.id;
            });
            return res.status(200).json({
                status: 'success',
                data: {
                    easy: result.EASY,
                    medium: result.MEDIUM,
                    hard: result.HARD
                }
            });
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const where = { isActive: true };

        if (difficulty && difficulty !== 'All') {
            where.difficulty = difficulty.toUpperCase();
        }

        if (search) {
            where.title = { contains: search, mode: 'insensitive' };
        }

        const [problems, total] = await Promise.all([
            prisma.problem.findMany({
                where,
                skip,
                take: limitNum,
                include: {
                    _count: {
                        select: {
                            submissions: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.problem.count({ where })
        ]);

        // Prisma doesn't easily support conditionally counting filtered relations directly inside _count natively without experimental features in this exact combination,
        // so we can get accepted counts with a groupBy or just count all and manually combine, but for simplicity, we map acceptance rates if possible, or fetch accepted separately.
        const problemIds = problems.map(p => p.id);
        const acceptedCounts = await prisma.submission.groupBy({
            by: ['problemId'],
            where: {
                problemId: { in: problemIds },
                status: 'ACCEPTED'
            },
            _count: { id: true }
        });

        const acceptedMap = {};
        acceptedCounts.forEach(ac => {
            acceptedMap[ac.problemId] = ac._count.id;
        });

        const formattedProblems = problems.map(p => {
            const totalSubmissions = p._count.submissions;
            const accepted = acceptedMap[p.id] || 0;
            const acceptanceRate = totalSubmissions > 0 ? ((accepted / totalSubmissions) * 100).toFixed(1) + '%' : '0.0%';

            return {
                id: p.id,
                title: p.title,
                slug: p.slug,
                difficulty: p.difficulty,
                timeLimit: p.timeLimit,
                memoryLimit: p.memoryLimit,
                acceptanceRate,
                _count: p._count
            };
        });

        res.status(200).json({
            status: 'success',
            data: {
                problems: formattedProblems,
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

export const getProblemBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const isAdmin = req.user && req.user.role === 'ADMIN';

        const problem = await prisma.problem.findUnique({
            where: { slug },
            include: {
                testCases: {
                    where: isAdmin ? undefined : { isHidden: false },
                    orderBy: { order: 'asc' }
                }
            }
        });

        if (!problem) {
            return next(new AppError('Problem not found', 404));
        }

        res.status(200).json({
            status: 'success',
            data: {
                problem: {
                    ...problem,
                    testCases: normalizeVisibleTestCases(problem.testCases)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};
