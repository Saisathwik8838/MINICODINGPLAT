import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, CheckCircle, Activity, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import useAuthStore from '../store/authStore.js';

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
                console.error("Failed to load dashboard data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [authUser]);

    if (loading) {
        return <div className="p-12 text-center text-gray-400">Loading Dashboard...</div>;
    }

    const acceptanceRate = totalSubs > 0 ? ((acceptedSubs / totalSubs) * 100).toFixed(1) : '0.0';

    const getStatusColor = (status) => {
        const map = {
            ACCEPTED: 'bg-green-500/10 text-green-400 border-green-500/20',
            WRONG_ANSWER: 'bg-red-500/10 text-red-400 border-red-500/20',
            TIME_LIMIT_EXCEEDED: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
            RUNTIME_ERROR: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
            COMPILATION_ERROR: 'bg-gray-700 text-gray-300',
            PENDING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            PROCESSING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        };
        return map[status] || 'bg-gray-800 text-white';
    };

    return (
        <div className="flex-1 overflow-y-auto bg-dark-900 code-scroll p-6 md:p-12 relative">
            <div className="max-w-6xl mx-auto space-y-8 relative z-10">
                
                {/* Greeting Header */}
                <div className="glass-panel p-8 border-l-4 border-l-primary-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                    <h1 className="text-3xl font-extrabold text-white mb-2">Hello, {userStats?.username} 👋</h1>
                    <p className="text-primary-400 text-sm font-medium">Joined {new Date(userStats?.createdAt).toLocaleDateString()}</p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Problems Solved" value={userStats?.totalSolved || 0} icon={<CheckCircle/>} color="text-green-400" />
                    <StatCard title="Total Submissions" value={totalSubs} icon={<Activity/>} color="text-blue-400" />
                    <StatCard title="Acceptance Rate" value={`${acceptanceRate}%`} icon={<Target/>} color="text-purple-400" />
                    <StatCard title="Account Score" value={userStats?.totalScore || 0} icon={<Star/>} color="text-amber-400" />
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Progress Breakdown */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-gray-400" /> Progress</h3>
                            <div className="space-y-6">
                                <ProgressBar label="Easy" solved={solvedCounts.EASY.length} total={problemCounts.easy} color="bg-green-400" />
                                <ProgressBar label="Medium" solved={solvedCounts.MEDIUM.length} total={problemCounts.medium} color="bg-amber-400" />
                                <ProgressBar label="Hard" solved={solvedCounts.HARD.length} total={problemCounts.hard} color="bg-red-400" />
                            </div>
                        </div>
                    </div>

                    {/* Recent Submissions */}
                    <div className="lg:col-span-8 glass-panel overflow-hidden">
                        <div className="p-6 border-b border-dark-700 bg-dark-800/50">
                            <h3 className="font-bold text-white">Recent Submissions</h3>
                        </div>
                        {recentSubmissions.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                No submissions yet. Start coding!
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm text-gray-300">
                                <thead className="bg-dark-800/80 text-xs uppercase text-gray-500 font-semibold border-b border-dark-700">
                                    <tr><th className="px-6 py-4">Problem</th><th className="px-6 py-4">Lang</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Runtime</th><th className="px-6 py-4 text-right">Date</th></tr>
                                </thead>
                                <tbody className="divide-y divide-dark-700">
                                    {recentSubmissions.map(s => (
                                        <tr key={s.id} className="hover:bg-dark-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <Link to={`/problems/${s.problem.slug}`} className="text-primary-400 font-medium hover:text-primary-300 transition-colors">{s.problem.title}</Link>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs">{s.language}</td>
                                            <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusColor(s.status)}`}>{s.status.replace(/_/g, ' ')}</span></td>
                                            <td className="px-6 py-4 text-right font-mono text-xs text-gray-400">{s.runtime || '-'} ms</td>
                                            <td className="px-6 py-4 text-right text-xs text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

const StatCard = ({ title, value, icon, color }) => (
    <div className="glass-panel p-6 flex justify-between items-center transition-transform hover:-translate-y-1">
        <div>
            <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
        </div>
        <div className={`w-12 h-12 rounded-xl bg-dark-700/50 flex flex-col items-center justify-center ${color}`}>
            {icon}
        </div>
    </div>
);

const ProgressBar = ({ label, solved, total, color }) => {
    const p = total > 0 ? (solved / total) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-gray-300">{label}</span>
                <span className="text-xs font-mono text-gray-400"><strong className="text-gray-200">{solved}</strong> / {total}</span>
            </div>
            <div className="h-2 w-full bg-dark-700 rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all duration-1000 ease-out`} style={{ width: `${p}%` }}></div>
            </div>
        </div>
    );
};
