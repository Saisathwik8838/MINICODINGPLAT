import * as authService from '../services/auth.service.js';
import { AppError } from '../middlewares/errorHandler.js';
import { env } from '../config/env.js';

const setCookie = (res, name, value, maxAge) => {
    res.cookie(name, value, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge,
    });
};

export const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            throw new AppError('Please provide username, email and password', 400);
        }

        const { user, accessToken, refreshToken } = await authService.registerUser(username, email, password);

        setCookie(res, 'refreshToken', refreshToken, 7 * 24 * 60 * 60 * 1000);

        res.status(201).json({
            status: 'success',
            data: { user, accessToken },
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new AppError('Please provide email and password', 400);
        }

        const { user, accessToken, refreshToken } = await authService.loginUser(email, password);

        setCookie(res, 'refreshToken', refreshToken, 7 * 24 * 60 * 60 * 1000);

        res.status(200).json({
            status: 'success',
            data: { user, accessToken },
        });
    } catch (error) {
        next(error);
    }
};

export const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.cookies;

        if (!refreshToken) {
            throw new AppError('No refresh token provided', 401);
        }

        const { accessToken, newRefreshToken } = await authService.refreshTokens(refreshToken);

        setCookie(res, 'refreshToken', newRefreshToken, 7 * 24 * 60 * 60 * 1000);

        res.status(200).json({
            status: 'success',
            data: { accessToken },
        });
    } catch (error) {
        next(error);
    }
};

export const logout = (req, res) => {
    res.cookie('refreshToken', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });

    res.status(200).json({ status: 'success' });
};

export const getMe = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError('Not authenticated', 401);

        const user = await authService.getUserProfile(req.user.userId);

        res.status(200).json({
            status: 'success',
            data: { user },
        });
    } catch (error) {
        next(error);
    }
};
