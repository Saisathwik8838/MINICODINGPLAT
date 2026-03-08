import { prisma } from '../config/db.js';

export const getLeaderboard = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;

        // Fetch users sorted by total score descending, then by total solved, then by creation date ascending
        const leaderboard = await prisma.user.findMany({
            take: limit,
            skip: skip,
            orderBy: [
                { totalScore: 'desc' },
                { totalSolved: 'desc' },
                { createdAt: 'asc' }
            ],
            select: {
                id: true,
                username: true,
                totalSolved: true,
                totalScore: true,
            }
        });

        // Optionally count total users for pagination, but might be slow for massive tables. 
        // We'll limit it for this scale.
        const totalUsers = await prisma.user.count({
            where: {
                totalScore: { gt: 0 }
            }
        });

        res.status(200).json({
            status: 'success',
            data: {
                leaderboard,
                pagination: {
                    total: totalUsers,
                    page,
                    limit,
                    totalPages: Math.ceil(totalUsers / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};
