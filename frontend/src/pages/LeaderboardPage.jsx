import React, { useEffect, useState } from 'react';
import { Flame, Medal, Trophy, Crown, ArrowUpRight } from 'lucide-react';
import api from '../api/axios.js';
import useAuthStore from '../store/authStore.js';

const podiumConfig = [
    {
        label: '1st Place',
        icon: <Crown className="h-5 w-5 text-amber-300" />,
        className: 'from-amber-400/20 via-amber-300/10 to-transparent'
    },
    {
        label: '2nd Place',
        icon: <Medal className="h-5 w-5 text-slate-200" />,
        className: 'from-slate-300/14 via-slate-100/6 to-transparent'
    },
    {
        label: '3rd Place',
        icon: <Medal className="h-5 w-5 text-orange-300" />,
        className: 'from-orange-400/16 via-orange-300/8 to-transparent'
    }
];

export default function LeaderboardPage() {
    const { user } = useAuthStore();
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 50;

    const fetchLeaderboard = async (pageNum) => {
        setLoading(true);

        try {
            const { data } = await api.get(`/leaderboard?page=${pageNum}&limit=${limit}`);
            setLeaderboardData(data.data.leaderboard || []);
            setTotalPages(data.data.pagination.totalPages);
            setTotalUsers(data.data.pagination.total);
            setPage(pageNum);
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard(1);
    }, []);

    const currentUserIndex = user ? leaderboardData.findIndex((entry) => entry.id === user.id) : -1;
    const visibleRank = currentUserIndex !== -1 ? (page - 1) * limit + currentUserIndex + 1 : null;
    const topThree = page === 1 ? leaderboardData.slice(0, 3) : [];

    return (
        <div className="page-shell code-scroll">
            <div className="ambient-orb ambient-orb-amber right-[5%] top-[40px] h-72 w-72" />
            <div className="ambient-orb ambient-orb-cyan left-[-60px] top-[280px] h-72 w-72" />

            <div className="page-width space-y-6">
                <section className="hero-panel section-fade">
                    <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-3xl">
                            <span className="kicker mb-4">Global Ranking</span>
                            <h1 className="text-3xl font-bold text-white md:text-4xl">
                                Leaderboard with a little more presence.
                            </h1>
                            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                                Follow the strongest performers, compare solved counts, and see where you appear on
                                the currently loaded page.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <SummaryCard
                                label="Developers Ranked"
                                value={totalUsers}
                                icon={<Trophy className="h-4 w-4 text-amber-300" />}
                            />
                            <SummaryCard
                                label="Visible Page Rank"
                                value={visibleRank ? `#${visibleRank}` : 'Not on page'}
                                icon={<ArrowUpRight className="h-4 w-4 text-sky-300" />}
                            />
                        </div>
                    </div>
                </section>

                {topThree.length > 0 && (
                    <section className="grid gap-4 lg:grid-cols-3">
                        {topThree.map((entry, index) => (
                            <div
                                key={entry.id}
                                className={`surface-card section-fade relative overflow-hidden p-6 ${
                                    index === 0 ? 'lg:-translate-y-2' : ''
                                }`}
                            >
                                <div
                                    className={`absolute inset-0 bg-gradient-to-br ${podiumConfig[index].className}`}
                                />
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                                            {podiumConfig[index].icon}
                                            {podiumConfig[index].label}
                                        </span>
                                        <span className="font-mono text-xs text-slate-500">
                                            Rank #{index + 1}
                                        </span>
                                    </div>

                                    <h2 className="mt-6 text-2xl font-bold text-white">{entry.username}</h2>
                                    <p className="mt-2 text-sm text-slate-400">
                                        {entry.totalSolved} solved problems and {entry.totalScore} score.
                                    </p>

                                    <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-amber-300">
                                        <Flame className="h-4 w-4" />
                                        Momentum stays high at the top.
                                    </div>
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                <section className="table-shell section-fade overflow-hidden">
                    <div className="flex flex-col gap-3 border-b border-white/10 bg-white/[0.03] p-6 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Rank Table
                            </p>
                            <h2 className="mt-2 text-xl font-bold text-white">Performance overview</h2>
                        </div>
                        <p className="text-sm text-slate-400">
                            Ordered by total score and problem-solving consistency.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-white/10 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                <tr>
                                    <th className="p-5 text-center">Rank</th>
                                    <th className="p-5">User</th>
                                    <th className="p-5 text-center">Solved</th>
                                    <th className="p-5 text-right">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {loading ? (
                                    Array.from({ length: 8 }).map((_, index) => (
                                        <tr key={index} className="animate-pulse">
                                            <td className="p-5">
                                                <div className="mx-auto h-6 w-6 rounded-full bg-dark-700" />
                                            </td>
                                            <td className="p-5">
                                                <div className="h-5 w-40 rounded-full bg-dark-700" />
                                            </td>
                                            <td className="p-5">
                                                <div className="mx-auto h-5 w-10 rounded-full bg-dark-700" />
                                            </td>
                                            <td className="p-5">
                                                <div className="ml-auto h-5 w-12 rounded-full bg-dark-700" />
                                            </td>
                                        </tr>
                                    ))
                                ) : leaderboardData.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="metric-icon h-14 w-14 bg-white/5">
                                                    <Trophy className="h-6 w-6 text-slate-400" />
                                                </div>
                                                <h3 className="text-lg font-semibold text-white">
                                                    No ranked users yet
                                                </h3>
                                                <p className="max-w-md text-sm leading-6 text-slate-400">
                                                    Leaderboard entries will appear after submissions start coming in.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    leaderboardData.map((entry, index) => {
                                        const rank = (page - 1) * limit + index + 1;
                                        const isCurrentUser = user && user.id === entry.id;

                                        return (
                                            <tr
                                                key={entry.id}
                                                className={`transition-colors hover:bg-white/[0.03] ${
                                                    isCurrentUser ? 'bg-sky-400/[0.05]' : ''
                                                }`}
                                            >
                                                <td className="p-5 text-center">
                                                    {rank <= 3 ? (
                                                        <Medal
                                                            className={`mx-auto h-5 w-5 ${
                                                                rank === 1
                                                                    ? 'text-amber-300'
                                                                    : rank === 2
                                                                        ? 'text-slate-200'
                                                                        : 'text-orange-300'
                                                            }`}
                                                        />
                                                    ) : (
                                                        <span className="font-mono text-slate-500">#{rank}</span>
                                                    )}
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-bold uppercase ${
                                                                isCurrentUser
                                                                    ? 'border-sky-300/30 bg-sky-400/15 text-sky-200'
                                                                    : 'border-white/10 bg-white/5 text-slate-200'
                                                            }`}
                                                        >
                                                            {entry.username.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p
                                                                className={`font-semibold ${
                                                                    isCurrentUser
                                                                        ? 'text-sky-200'
                                                                        : 'text-slate-100'
                                                                }`}
                                                            >
                                                                {entry.username}
                                                            </p>
                                                            {isCurrentUser && (
                                                                <p className="text-xs uppercase tracking-[0.18em] text-sky-300">
                                                                    You
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-center font-mono text-slate-300">
                                                    {entry.totalSolved}
                                                </td>
                                                <td className="p-5 text-right">
                                                    <div className="inline-flex items-center gap-2 font-mono font-semibold text-amber-300">
                                                        <span>{entry.totalScore}</span>
                                                        <Flame className="h-4 w-4" />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm text-slate-400">
                            Showing page {page} of {totalPages} with {leaderboardData.length} visible developers.
                        </span>

                        {totalPages > 1 && (
                            <div className="flex gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => fetchLeaderboard(page - 1)}
                                    className="secondary-button px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    disabled={page === totalPages}
                                    onClick={() => fetchLeaderboard(page + 1)}
                                    className="secondary-button px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

const SummaryCard = ({ label, value, icon }) => (
    <div className="surface-card min-w-[190px] p-4">
        <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
            {icon}
        </div>
        <p className="mt-4 text-xl font-bold text-white">{value}</p>
    </div>
);
