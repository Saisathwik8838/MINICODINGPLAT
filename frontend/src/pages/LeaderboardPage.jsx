import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Flame, Code2 } from 'lucide-react';
import api from '../api/axios.js';
import useAuthStore from '../store/authStore.js';

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

    // Find current user's rank on the current page, if they exist on it
    const currentUserIndex = user ? leaderboardData.findIndex(u => u.id === user.id) : -1;
    const myRank = currentUserIndex !== -1 ? (page - 1) * limit + currentUserIndex + 1 : null;

    return (
        <div className="flex flex-col h-full w-full bg-dark-900 overflow-y-auto">
            {/* Leaderboard Header (Hero Section) */}
            <div className="relative overflow-hidden border-b border-dark-700/50 bg-dark-800/80 shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-primary-500/10 opacity-50 pointer-events-none"></div>
                <div className="max-w-5xl mx-auto px-6 py-12 relative z-10 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.3)] mb-6">
                        <Trophy className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Global Leaderboard</h1>
                    <p className="text-gray-400 max-w-lg mx-auto">
                        Solve problems, earn points, and climb the ranks. Only the most optimal solutions solidify your legacy.
                    </p>
                    {user && (
                        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dark-700 border border-dark-600 text-sm font-medium">
                            <span className="text-gray-300">Your Position:</span>
                            <span className={myRank ? "text-primary-400 font-bold" : "text-gray-500"}>
                                {myRank ? `Rank #${myRank}` : 'Unranked'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Leaderboard Content */}
            <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-8">
                <div className="glass-panel overflow-hidden border border-dark-700/50 shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-dark-800/80 text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-dark-700/50">
                                <th className="p-5 text-center w-24">Rank</th>
                                <th className="p-5">User</th>
                                <th className="p-5 text-center">Problems Solved</th>
                                <th className="p-5 text-right pr-8">Total Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-700/50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="p-5 text-center"><div className="h-6 w-6 bg-dark-700 mx-auto rounded-full"></div></td>
                                        <td className="p-5"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-dark-700 rounded-full"></div><div className="h-4 w-24 bg-dark-700 rounded"></div></div></td>
                                        <td className="p-5 text-center"><div className="h-4 w-8 bg-dark-700 mx-auto rounded"></div></td>
                                        <td className="p-5 text-right"><div className="h-4 w-12 bg-dark-700 ml-auto rounded"></div></td>
                                    </tr>
                                ))
                            ) : leaderboardData.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-16 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="p-4 rounded-full bg-dark-800 text-gray-600"><Trophy className="w-8 h-8" /></div>
                                            <p className="text-sm">No users have solved any problems yet.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                leaderboardData.map((u, idx) => {
                                    const rank = (page - 1) * limit + idx + 1;
                                    const isCurrentUser = user && user.id === u.id;
                                    
                                    return (
                                        <tr
                                            key={u.id}
                                            className={`transition-colors group ${isCurrentUser
                                                    ? 'bg-primary-500/5 hover:bg-primary-500/10'
                                                    : 'hover:bg-dark-800/40'
                                                }`}
                                        >
                                            <td className="p-5 text-center">
                                                {rank === 1 ? (
                                                    <div className="flex justify-center"><Medal className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" /></div>
                                                ) : rank === 2 ? (
                                                    <div className="flex justify-center"><Medal className="w-6 h-6 text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.5)]" /></div>
                                                ) : rank === 3 ? (
                                                    <div className="flex justify-center"><Medal className="w-6 h-6 text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.5)]" /></div>
                                                ) : (
                                                    <span className="font-mono text-gray-500 font-medium text-lg">{rank}</span>
                                                )}
                                            </td>
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border ${isCurrentUser ? 'bg-primary-600 text-white border-primary-500' : 'bg-dark-700 text-gray-300 border-dark-600'
                                                        }`}>
                                                        {u.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className={`font-semibold ${isCurrentUser ? 'text-primary-400' : 'text-gray-200'} group-hover:text-white transition-colors`}>
                                                        {u.username}
                                                    </span>
                                                    {isCurrentUser && (
                                                        <span className="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 text-[10px] font-bold uppercase tracking-wider border border-primary-500/30">
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-5 text-center">
                                                <span className="font-mono text-gray-300">{u.totalSolved}</span>
                                            </td>
                                            <td className="p-5 text-right pr-8">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <span className="font-mono font-bold text-lg text-amber-400">{u.totalScore}</span>
                                                    <Flame className="w-4 h-4 text-orange-500" />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {/* Pagination Footer */}
                    <div className="bg-dark-800/50 border-t border-dark-700/50 px-6 py-4 flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                            Showing <strong className="text-gray-200">{leaderboardData.length}</strong> of <strong className="text-gray-200">{totalUsers}</strong> developers
                        </span>
                        {totalPages > 1 && (
                            <div className="flex gap-2">
                                <button 
                                    disabled={page === 1}
                                    onClick={() => fetchLeaderboard(page - 1)}
                                    className="px-3 py-1.5 rounded-md bg-dark-700 hover:bg-dark-600 text-gray-200 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button 
                                    disabled={page === totalPages}
                                    onClick={() => fetchLeaderboard(page + 1)}
                                    className="px-3 py-1.5 rounded-md bg-dark-700 hover:bg-dark-600 text-gray-200 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
