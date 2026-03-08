import React from 'react';
import { Trophy, Medal, Award, Flame } from 'lucide-react';

export default function LeaderboardPage() {

    // Mock data representing the response from /api/v1/leaderboard
    const leaderboardData = [
        { rank: 1, username: 'saisa', score: 1200, solved: 120, isCurrentUser: true },
        { rank: 2, username: 'coder_elite', score: 1150, solved: 115, isCurrentUser: false },
        { rank: 3, username: 'algo_master', score: 1100, solved: 110, isCurrentUser: false },
        { rank: 4, username: 'byte_ninja', score: 950, solved: 95, isCurrentUser: false },
        { rank: 5, username: 'neo_matrix', score: 800, solved: 80, isCurrentUser: false },
        { rank: 6, username: 'bug_squasher', score: 750, solved: 75, isCurrentUser: false },
    ];

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
                            {leaderboardData.map((user) => (
                                <tr
                                    key={user.rank}
                                    className={`transition-colors group ${user.isCurrentUser
                                            ? 'bg-primary-500/5 hover:bg-primary-500/10'
                                            : 'hover:bg-dark-800/40'
                                        }`}
                                >
                                    <td className="p-5 text-center">
                                        {user.rank === 1 ? (
                                            <div className="flex justify-center"><Medal className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" /></div>
                                        ) : user.rank === 2 ? (
                                            <div className="flex justify-center"><Medal className="w-6 h-6 text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.5)]" /></div>
                                        ) : user.rank === 3 ? (
                                            <div className="flex justify-center"><Medal className="w-6 h-6 text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.5)]" /></div>
                                        ) : (
                                            <span className="font-mono text-gray-500 font-medium text-lg">{user.rank}</span>
                                        )}
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border ${user.isCurrentUser ? 'bg-primary-600 text-white border-primary-500' : 'bg-dark-700 text-gray-300 border-dark-600'
                                                }`}>
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <span className={`font-semibold ${user.isCurrentUser ? 'text-primary-400' : 'text-gray-200'} group-hover:text-white transition-colors`}>
                                                {user.username}
                                            </span>
                                            {user.isCurrentUser && (
                                                <span className="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 text-[10px] font-bold uppercase tracking-wider border border-primary-500/30">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-5 text-center">
                                        <span className="font-mono text-gray-300">{user.solved}</span>
                                    </td>
                                    <td className="p-5 text-right pr-8">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <span className="font-mono font-bold text-lg text-amber-400">{user.score}</span>
                                            <Flame className="w-4 h-4 text-orange-500" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination Mock Footer */}
                    <div className="bg-dark-800/50 border-t border-dark-700/50 px-6 py-4 flex items-center justify-between">
                        <span className="text-sm text-gray-400">Showing top <strong className="text-gray-200">6</strong> developers</span>
                        <div className="flex gap-2">
                            <button disabled className="px-3 py-1.5 rounded-md bg-dark-700 text-gray-500 text-sm font-medium cursor-not-allowed">Previous</button>
                            <button className="px-3 py-1.5 rounded-md bg-dark-700 hover:bg-dark-600 text-gray-200 text-sm font-medium transition-colors">Next</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
