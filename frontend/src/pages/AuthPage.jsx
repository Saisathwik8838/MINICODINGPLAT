import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import useAuthStore from '../store/authStore.js';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);

    const { login, register, loading, isAuthenticated } = useAuthStore();
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setSuccess(false);

        let result;
        if (isLogin) {
            result = await login(formData.email, formData.password);
        } else {
            result = await register(formData.username, formData.email, formData.password);
        }

        if (result.success) {
            setSuccess(true);
            setTimeout(() => navigate('/'), 1500);
        } else {
            setMessage(result.message);
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center p-6 bg-dark-900 relative overflow-hidden">
            {/* Background elements for flair */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md glass-panel p-8 z-10 transition-all">
                <div className="text-center mb-10">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-xl">
                        <Lock className="text-white w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
                        {isLogin ? 'Welcome Back' : 'Join MiniLeetCode'}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {isLogin ? 'Sign in to access your platform benchmarks' : 'Join a world of high-performance code execution'}
                    </p>
                </div>

                {message && (
                    <div className="mb-6 p-4 rounded-lg bg-error/10 border border-error/20 flex items-center gap-3 text-error text-sm animate-in fade-in slide-in-from-top-1">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{message}</span>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3 text-green-400 text-sm">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Authentication successful! Redirecting...</span>
                    </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="relative group">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary-400 transition-colors" />
                            <input
                                required
                                type="text"
                                placeholder="Username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full bg-dark-700/50 border border-dark-600 rounded-lg py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-transparent transition-all"
                            />
                        </div>
                    )}

                    <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary-400 transition-colors" />
                        <input
                            required
                            type="email"
                            placeholder="Email address"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-dark-700/50 border border-dark-600 rounded-lg py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-transparent transition-all"
                        />
                    </div>

                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary-400 transition-colors" />
                        <input
                            required
                            type="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full bg-dark-700/50 border border-dark-600 rounded-lg py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-transparent transition-all"
                        />
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className="w-full py-2.5 rounded-lg bg-gradient-to-r from-primary-500 to-indigo-600 hover:from-primary-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-gray-400 hover:text-white text-xs transition-colors underline decoration-primary-500/30 underline-offset-4"
                    >
                        {isLogin ? "Don't have an account? Register" : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
