import React, { useEffect, useState } from 'react';
import {
    Activity,
    ArrowRight,
    CalendarDays,
    CheckCircle,
    Star,
    Target,
    TrendingUp,
    Trophy
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import useAuthStore from '../store/authStore.js';

const statusToneMap = {
    ACCEPTED: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    WRONG_ANSWER: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
    TIME_LIMIT_EXCEEDED: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    RUNTIME_ERROR: 'border-orange-400/20 bg-orange-400/10 text-orange-300',
    COMPILATION_ERROR: 'border-slate-500/20 bg-slate-500/10 text-slate-300',
    PENDING: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
    PROCESSING: 'border-sky-400/20 bg-sky-400/10 text-sky-300'
};

const formatStatus = (status = '') => status.replace(/_/g, ' ');

export default function DashboardPage() {
    const { user: authUser } = useAuthStore();
    const [userStats, setUserStats] = useState(null);
    const [recentSubmissions, setRecentSubmissions] = useState([]);
    const [totalSubs, setTotalSubs] = useState(0);
    const [acceptedSubs, setAcceptedSubs] = useState(0);
    const [problemCounts, setProblemCounts] = useState({ easy: 0, medium: 0, hard: 0 });
    const [solvedCounts, setSolvedCounts] = useState({ EASY: [], MEDIUM: [], HARD: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authUser) return;

        const fetchData = async () => {
            try {
                const [authRes, subsRes, accRes, countsRes, profileRes] = await Promise.all([
                    api.get('/auth/me'),
                    api.get('/submissions?limit=10'),
                    api.get('/submissions?status=ACCEPTED&limit=1'),
                    api.get('/problems?countOnly=true'),
                    api.get(`/profile/${authUser.username}`)
                ]);

                setUserStats(authRes.data.data.user);
                setRecentSubmissions(subsRes.data.data.submissions);
                setTotalSubs(subsRes.data.data.pagination.total);
                setAcceptedSubs(accRes.data.data.pagination.total);
                setProblemCounts(countsRes.data.data);
                setSolvedCounts(profileRes.data.data.stats.solvedByDifficulty);
            } catch (err) {
                console.error('Failed to load dashboard data', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [authUser]);

    if (loading) {
        return (
            <div className="page-shell code-scroll">
                <div className="ambient-orb ambient-orb-cyan right-[4%] top-[40px] h-72 w-72" />
                <div className="ambient-orb ambient-orb-amber left-[-40px] top-[320px] h-72 w-72" />

                <div className="page-width space-y-6">
                    <div className="hero-panel animate-pulse">
                        <div className="h-4 w-36 rounded-full bg-dark-700" />
                        <div className="mt-5 h-12 w-full max-w-2xl rounded-2xl bg-dark-700" />
                        <div className="mt-4 h-5 w-full max-w-xl rounded-full bg-dark-800" />
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

                    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                        <div className="glass-panel animate-pulse p-6">
                            <div className="h-5 w-36 rounded-full bg-dark-700" />
                            <div className="mt-6 space-y-5">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <div key={index}>
                                        <div className="mb-3 h-4 w-28 rounded-full bg-dark-700" />
                                        <div className="h-2 w-full rounded-full bg-dark-700" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="table-shell animate-pulse p-6">
                            <div className="h-5 w-40 rounded-full bg-dark-700" />
                            <div className="mt-6 space-y-3">
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <div key={index} className="h-16 rounded-2xl bg-dark-800" />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const acceptanceRate = totalSubs > 0 ? ((acceptedSubs / totalSubs) * 100).toFixed(1) : '0.0';
    const joinedDate = userStats?.createdAt
        ? new Date(userStats.createdAt).toLocaleDateString()
        : 'Recently';

    const metrics = [
        {
            title: 'Problems Solved',
            value: userStats?.totalSolved || 0,
            subtitle: 'Unique problems completed',
            icon: <CheckCircle className="h-5 w-5 text-emerald-300" />
        },
        {
            title: 'Total Submissions',
            value: totalSubs,
            subtitle: 'Attempts recorded in your account',
            icon: <Activity className="h-5 w-5 text-sky-300" />
        },
        {
            title: 'Acceptance Rate',
            value: `${acceptanceRate}%`,
            subtitle: 'Accepted runs over all submissions',
            icon: <Target className="h-5 w-5 text-violet-300" />
        },
        {
            title: 'Account Score',
            value: userStats?.totalScore || 0,
            subtitle: 'Points earned from solved challenges',
            icon: <Star className="h-5 w-5 text-amber-300" />
        }
    ];

    return (
        <div className="page-shell code-scroll">
            <div className="ambient-orb ambient-orb-cyan right-[4%] top-[40px] h-72 w-72" />
            <div className="ambient-orb ambient-orb-amber left-[-40px] top-[320px] h-72 w-72" />

            <div className="page-width space-y-6">
                <section className="hero-panel section-fade">
                    <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-3xl">
                            <span className="kicker mb-4">Personal Dashboard</span>
                            <h1 className="text-3xl font-bold text-white md:text-4xl">
                                Track your momentum, {userStats?.username}.
                            </h1>
                            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                                Your workspace now highlights progress, recent attempts, and difficulty coverage
                                without changing how submissions or stats work behind the scenes.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <Link to="/problems" className="primary-button">
                                    Solve a problem
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                                <Link to="/leaderboard" className="secondary-button">
                                    View leaderboard
                                </Link>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <MiniSummaryCard
                                label="Member Since"
                                value={joinedDate}
                                icon={<CalendarDays className="h-4 w-4 text-sky-300" />}
                            />
                            <MiniSummaryCard
                                label="Accepted Runs"
                                value={acceptedSubs}
                                icon={<Trophy className="h-4 w-4 text-amber-300" />}
                            />
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {metrics.map((metric) => (
                        <StatCard key={metric.title} {...metric} />
                    ))}
                </section>

                <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                    <div className="glass-panel section-fade p-6">
                        <div className="mb-6 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    Difficulty Breakdown
                                </p>
                                <h2 className="mt-2 text-xl font-bold text-white">Progress map</h2>
                            </div>
                            <div className="metric-icon h-11 w-11 bg-white/5">
                                <TrendingUp className="h-5 w-5 text-slate-200" />
                            </div>
                        </div>

                        <div className="space-y-5">
                            <ProgressBar
                                label="Easy"
                                solved={solvedCounts.EASY.length}
                                total={problemCounts.easy}
                                color="from-emerald-400 to-lime-300"
                            />
                            <ProgressBar
                                label="Medium"
                                solved={solvedCounts.MEDIUM.length}
                                total={problemCounts.medium}
                                color="from-amber-400 to-orange-300"
                            />
                            <ProgressBar
                                label="Hard"
                                solved={solvedCounts.HARD.length}
                                total={problemCounts.hard}
                                color="from-rose-400 to-red-300"
                            />
                        </div>
                    </div>

                    <div className="table-shell section-fade overflow-hidden">
                        <div className="flex flex-col gap-4 border-b border-white/10 bg-white/[0.03] p-6 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    Last 10 Attempts
                                </p>
                                <h2 className="mt-2 text-xl font-bold text-white">Recent submissions</h2>
                            </div>
                            <p className="text-sm text-slate-400">
                                Keep an eye on trends, runtimes, and the types of failures showing up most often.
                            </p>
                        </div>

                        {recentSubmissions.length === 0 ? (
                            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                                <div className="metric-icon h-14 w-14 bg-white/5">
                                    <Activity className="h-6 w-6 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-white">No submissions yet</h3>
                                <p className="max-w-md text-sm leading-6 text-slate-400">
                                    Your first runs will appear here once you start solving problems.
                                </p>
                                <Link to="/problems" className="secondary-button">
                                    Open problem library
                                </Link>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-white/10 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                        <tr>
                                            <th className="px-6 py-4">Problem</th>
                                            <th className="px-6 py-4">Language</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Runtime</th>
                                            <th className="px-6 py-4 text-right">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {recentSubmissions.map((submission) => (
                                            <tr
                                                key={submission.id}
                                                className="transition-colors hover:bg-white/[0.03]"
                                            >
                                                <td className="px-6 py-4">
                                                    <Link
                                                        to={`/problems/${submission.problem.slug}`}
                                                        className="font-semibold text-slate-100 transition-colors hover:text-sky-300"
                                                    >
                                                        {submission.problem.title}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-slate-400">
                                                    {submission.language}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                                                            statusToneMap[submission.status] ||
                                                            'border-slate-500/20 bg-slate-500/10 text-slate-300'
                                                        }`}
                                                    >
                                                        {formatStatus(submission.status)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-xs text-slate-400">
                                                    {submission.runtime ? `${submission.runtime} ms` : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right text-xs text-slate-500">
                                                    {new Date(submission.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

const MiniSummaryCard = ({ label, value, icon }) => (
    <div className="surface-card min-w-[180px] p-4">
        <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
            {icon}
        </div>
        <p className="mt-4 text-xl font-bold text-white">{value}</p>
    </div>
);

const StatCard = ({ title, value, subtitle, icon }) => (
    <div className="metric-card section-fade">
        <div>
            <p className="text-sm font-medium text-slate-400">{title}</p>
            <h3 className="mt-2 text-3xl font-bold text-white">{value}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
        </div>
        <div className="metric-icon">{icon}</div>
    </div>
);

const ProgressBar = ({ label, solved, total, color }) => {
    const progress = total > 0 ? (solved / total) * 100 : 0;

    return (
        <div className="rounded-[22px] border border-white/8 bg-white/[0.02] p-4">
            <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-slate-200">{label}</p>
                    <p className="text-xs text-slate-500">Solved {solved} out of {total || 0} problems</p>
                </div>
                <span className="font-mono text-xs text-slate-400">{progress.toFixed(0)}%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-dark-700">
                <div
                    className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700 ease-out`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};
