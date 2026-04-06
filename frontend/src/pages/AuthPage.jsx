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
        <div className="page-shell overflow-hidden">
            <div className="ambient-orb ambient-orb-cyan left-[-120px] top-[80px] h-72 w-72" />
            <div className="ambient-orb ambient-orb-amber bottom-[-40px] right-[8%] h-80 w-80" />

            <div className="page-width flex min-h-full items-center justify-center">
                <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <section className="hero-panel section-fade hidden lg:flex lg:min-h-[620px] lg:flex-col lg:justify-between">
                        <div className="space-y-6">
                            <span className="kicker">Practice Platform</span>
                            <div className="space-y-4">
                                <h1 className="text-4xl font-bold text-white xl:text-5xl">
                                    A calmer place to write code, test ideas, and ship better solutions.
                                </h1>
                                <p className="max-w-xl text-base leading-7 text-slate-300">
                                    Keep your flow state. Browse problems, iterate in the editor, and track progress
                                    with a workspace that feels more like a modern product and less like a raw admin
                                    panel.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="surface-card p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    Sandbox
                                </p>
                                <p className="mt-3 text-lg font-semibold text-white">Fast code execution</p>
                                <p className="mt-2 text-sm leading-6 text-slate-400">
                                    Run Python, Node, C++, and Java without leaving the page.
                                </p>
                            </div>
                            <div className="surface-card p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    Progress
                                </p>
                                <p className="mt-3 text-lg font-semibold text-white">Clear milestones</p>
                                <p className="mt-2 text-sm leading-6 text-slate-400">
                                    Review solved counts, acceptance rate, and recent submissions in one place.
                                </p>
                            </div>
                            <div className="surface-card p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    Community
                                </p>
                                <p className="mt-3 text-lg font-semibold text-white">Discuss approaches</p>
                                <p className="mt-2 text-sm leading-6 text-slate-400">
                                    Compare solutions, learn patterns, and build consistency over time.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="glass-panel section-fade mx-auto w-full max-w-xl p-6 md:p-8">
                        <div className="mb-8 space-y-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 shadow-[0_18px_38px_rgba(37,99,235,0.35)]">
                                <Lock className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="kicker mb-3">{isLogin ? 'Welcome back' : 'Create your account'}</p>
                                <h1 className="text-3xl font-bold text-white">
                                    {isLogin ? 'Sign in to continue building momentum.' : 'Start your coding practice space.'}
                                </h1>
                                <p className="mt-3 text-sm leading-6 text-slate-400">
                                    {isLogin
                                        ? 'Pick up right where you left off with your saved drafts and recent runs.'
                                        : 'Register once and keep your submissions, stats, and solved history in one place.'}
                                </p>
                            </div>
                        </div>

                        {message && (
                            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{message}</span>
                            </div>
                        )}

                        {success && (
                            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>Authentication successful! Redirecting...</span>
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            {!isLogin && (
                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        Username
                                    </span>
                                    <div className="relative">
                                        <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                        <input
                                            required
                                            type="text"
                                            placeholder="Choose a username"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="soft-input pl-11"
                                        />
                                    </div>
                                </label>
                            )}

                            <label className="block">
                                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Email
                                </span>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                    <input
                                        required
                                        type="email"
                                        placeholder="you@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="soft-input pl-11"
                                    />
                                </div>
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Password
                                </span>
                                <div className="relative">
                                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                    <input
                                        required
                                        type="password"
                                        placeholder="Enter your password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="soft-input pl-11"
                                    />
                                </div>
                            </label>

                            <button
                                disabled={loading}
                                type="submit"
                                className="primary-button mt-2 w-full justify-center py-3 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
                            </button>
                        </form>

                        <div className="mt-8 border-t border-white/10 pt-6 text-center">
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
                            >
                                {isLogin ? "Don't have an account? Register" : "Already have an account? Sign in"}
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
