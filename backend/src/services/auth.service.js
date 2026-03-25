import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { signTokens, verifyRefreshToken } from '../utils/jwt.js';

export const registerUser = async (username, email, passwordHash) => {
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [{ email }, { username }],
        },
    });

    if (existingUser) {
        if (existingUser.email === email) {
            throw new AppError('Email is already registered.', 409);
        }
        throw new AppError('Username is already taken.', 409);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(passwordHash, salt);

    const user = await prisma.user.create({
        data: {
            username,
            email,
            passwordHash: hashedPassword,
        },
    });

    const { accessToken, refreshToken } = signTokens(user.id, user.role);

    return {
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
        accessToken,
        refreshToken,
    };
};

export const loginUser = async (email, passwordHash) => {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user || !(await bcrypt.compare(passwordHash, user.passwordHash))) {
        throw new AppError('Invalid email or password', 401);
    }

    const { accessToken, refreshToken } = signTokens(user.id, user.role);

    return {
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
        accessToken,
        refreshToken,
    };
};

export const refreshTokens = async (token) => {
    try {
        const decoded = verifyRefreshToken(token);

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        const { accessToken, refreshToken } = signTokens(user.id, user.role);

        return { accessToken, newRefreshToken: refreshToken };
    } catch (error) {
        throw new AppError('Invalid or expired refresh token', 401);
    }
};

export const getUserProfile = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            totalSolved: true,
            totalScore: true,
            createdAt: true,
            _count: {
                select: { submissions: true }
            }
        },
    });

    if (!user) throw new AppError('User not found', 404);

    return {
        ...user,
        totalSubmissions: user._count.submissions,
        _count: undefined
    };
};
