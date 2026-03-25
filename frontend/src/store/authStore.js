import { create } from 'zustand';
import api from '../api/axios.js';

const useAuthStore = create((set) => ({
    user: null,
    isAuthenticated: false,
    loading: true,

    // Initial session check on refresh
    checkSession: async () => {
        set({ loading: true });
        try {
            const { data } = await api.get('/auth/me');
            set({ user: data.data.user, isAuthenticated: true });
        } catch (error) {
            set({ user: null, isAuthenticated: false });
        } finally {
            set({ loading: false });
        }
    },

    register: async (username, email, password) => {
        set({ loading: true });
        try {
            const { data } = await api.post('/auth/register', { username, email, password });
            const { user, accessToken } = data.data;
            localStorage.setItem('accessToken', accessToken);
            set({ user, isAuthenticated: true });
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Registration failed' };
        } finally {
            set({ loading: false });
        }
    },

    login: async (email, password) => {
        set({ loading: true });
        try {
            const { data } = await api.post('/auth/login', { email, password });
            const { user, accessToken } = data.data;
            localStorage.setItem('accessToken', accessToken);
            set({ user, isAuthenticated: true });
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Login failed' };
        } finally {
            set({ loading: false });
        }
    },

    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('accessToken');
            set({ user: null, isAuthenticated: false });
        }
    }
}));

export default useAuthStore;
