import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signTokens = (userId, role) => {
    const accessToken = jwt.sign({ userId, role }, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRE,
    });

    const refreshToken = jwt.sign({ userId, role }, env.REFRESH_TOKEN_SECRET, {
        expiresIn: env.REFRESH_TOKEN_EXPIRE,
    });

    return { accessToken, refreshToken };
};

export const verifyAccessToken = (token) => {
    return jwt.verify(token, env.JWT_SECRET);
};

export const verifyRefreshToken = (token) => {
    return jwt.verify(token, env.REFRESH_TOKEN_SECRET);
};
