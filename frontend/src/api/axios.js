import axios from 'axios';

// The axios instance that talks to the Nginx Reverse Proxy
const api = axios.create({
    baseURL: '/api/v1', // Relative URL works through Nginx
    withCredentials: true, // Crucial for refreshToken cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

// Auto-inject the accessToken from localStorage if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for handling 401 and token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const { data } = await axios.get('/api/v1/auth/refresh', { withCredentials: true });
                localStorage.setItem('accessToken', data.data.accessToken);
                originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed, clear session
                localStorage.removeItem('accessToken');
                window.location.href = '/auth'; // Simple redirect to Login
            }
        }
        return Promise.reject(error);
    }
);

export default api;
