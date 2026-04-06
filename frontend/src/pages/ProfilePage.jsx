import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, Calendar, CheckCircle, Code2, Trophy, User } from 'lucide-react';
import api from '../api/axios.js';
import useAuthStore from '../store/authStore.js';

const difficultyStyles = {
    Easy: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    Medium: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    Hard: 'border-rose-400/20 bg-rose-400/10 text-rose-300'
};

export default function ProfilePage() {
    const { username } = useParams();
    const { user: authUser } = useAuthStore();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data } = await api.get(`/profile/${username}`);
                setProfile(data.data);
            } catch (err) {
                setError(err.response?.status === 404 ? 'User not found' : 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [username]);

    if (loading) {
        return (
            <div className="page-shell code-scroll">
                <div className="ambient-orb ambient-orb-cyan right-[8%] top-[60px] h-72 w-72" />
                <div className="ambient-orb ambient-orb-amber left-[-70px] top-[300px] h-72 w-72" />

                <div className="page-width max-w-5xl space-y-6">
                    <div className="hero-panel animate-pulse">
                        <div className="flex flex-col gap-6 md:flex-row md:items-center">
                            <div className="h-24 w-24 rounded-[28px] bg-dark-700" />
                            <div className="flex-1 space-y-3">
                                <div className="h-10 w-56 rounded-2xl bg-dark-700" />
                                <div className="h-4 w-40 rounded-full bg-dark-800" />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="metric-card animate-pulse">
                                <div className="space-y-3">
                                    <div className="h-4 w-24 rounded-full bg-dark-700" />
                                    <div className="h-8 w-20 rounded-2xl bg-dark-700" />
                                </div>
                                <div className="metric-icon bg-dark-700" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="page-shell code-scroll">
                <div className="page-width flex min-h-full max-w-3xl items-center justify-center">
                    <div className="glass-panel w-full p-8 text-center md:p-10">
                        <div className="metric-icon mx-auto h-16 w-16 bg-white/5">
                            <AlertTriangle className="h-7 w-7 text-slate-400" />
                        </div>
                        <h2 className="mt-5 text-2xl font-bold text-white">{error || 'User not found'}</h2>
                        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
                            The profile could not be loaded. The user may not exist, or the account may be unavailable.
                        </p>
                        <Link to="/" className="primary-button mt-6">
                            Back to problem library
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const { user, stats } = profile;
    const isOwnProfile = authUser?.username === user.username;
    const solvedByDifficulty = stats?.solvedByDifficulty || { EASY: [], MEDIUM: [], HARD: [] };

    const metricCards = [
        {
            title: 'Problems Solved',
            value: user.totalSolved,
            subtitle: 'Unique challenges completed',
            icon: <CheckCircle className="h-5 w-5 text-emerald-300" />
        },
        {
            title: 'Total Score',
            value: user.totalScore,
            subtitle: 'Points accumulated across solves',
            icon: <Trophy className="h-5 w-5 text-amber-300" />
        },
        {
            title: 'Easy Solves',
            value: solvedByDifficulty.EASY.length,
            subtitle: 'Foundation problems finished',
            icon: <Code2 className="h-5 w-5 text-sky-300" />
        },
        {
            title: 'Hard Solves',
            value: solvedByDifficulty.HARD.length,
            subtitle: 'Advanced challenges cleared',
            icon: <User className="h-5 w-5 text-rose-300" />
        }
    ];

    return (
        <div className="page-shell code-scroll">
            <div className="ambient-orb ambient-orb-cyan right-[8%] top-[60px] h-72 w-72" />
            <div className="ambient-orb ambient-orb-amber left-[-70px] top-[300px] h-72 w-72" />

            <div className="page-width max-w-5xl space-y-6">
                <section className="hero-panel section-fade">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                            <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-gradient-to-br from-sky-400 to-blue-700 text-4xl font-bold text-white shadow-[0_22px_42px_rgba(37,99,235,0.35)]">
                                {user.username.charAt(0).toUpperCase()}
                            </div>

                            <div>
                                <span className="kicker mb-3">Developer Profile</span>
                                <h1 className="text-3xl font-bold text-white md:text-4xl">{user.username}</h1>
                                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                                    <span className="inline-flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-sky-300" />
                                        Joined {new Date(user.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {isOwnProfile && (
                            <Link to="/dashboard" className="secondary-button">
                                <User className="h-4 w-4" />
                                Go to dashboard
                            </Link>
                        )}
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {metricCards.map((card) => (
                        <MetricCard key={card.title} {...card} />
                    ))}
                </section>

                <section className="glass-panel section-fade p-6 md:p-8">
                    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Solved Problems
                            </p>
                            <h2 className="mt-2 text-2xl font-bold text-white">Difficulty breakdown</h2>
                        </div>
                        <p className="text-sm text-slate-400">
                            Browse the problems this user has already completed.
                        </p>
                    </div>

                    <div className="space-y-8">
                        <DifficultySection
                            title="Easy"
                            data={solvedByDifficulty.EASY}
                            emptyMessage="No easy problems solved yet."
                        />
                        <DifficultySection
                            title="Medium"
                            data={solvedByDifficulty.MEDIUM}
                            emptyMessage="No medium problems solved yet."
                        />
                        <DifficultySection
                            title="Hard"
                            data={solvedByDifficulty.HARD}
                            emptyMessage="No hard problems solved yet."
                        />
                    </div>
                </section>
            </div>
        </div>
    );
}

const MetricCard = ({ title, value, subtitle, icon }) => (
    <div className="metric-card section-fade">
        <div>
            <p className="text-sm font-medium text-slate-400">{title}</p>
            <h3 className="mt-2 text-3xl font-bold text-white">{value}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
        </div>
        <div className="metric-icon">{icon}</div>
    </div>
);

const DifficultySection = ({ title, data, emptyMessage }) => (
    <div>
        <div className="mb-4 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
                <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        difficultyStyles[title]
                    }`}
                >
                    {title}
                </span>
                <h3 className="text-lg font-semibold text-white">{title} solved problems</h3>
            </div>
            <span className="font-mono text-sm text-slate-400">{data.length}</span>
        </div>

        {data.length === 0 ? (
            <p className="text-sm text-slate-500">{emptyMessage}</p>
        ) : (
            <div className="flex flex-wrap gap-3">
                {data.map((problem) => (
                    <Link
                        key={problem.slug}
                        to={`/problems/${problem.slug}`}
                        className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-0.5 ${
                            difficultyStyles[title]
                        }`}
                    >
                        {problem.title}
                    </Link>
                ))}
            </div>
        )}
    </div>
);
