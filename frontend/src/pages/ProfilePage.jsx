import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Calendar, Trophy, CheckCircle, Code2, AlertTriangle } from 'lucide-react';
import api from '../api/axios.js';
import useAuthStore from '../store/authStore.js';

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
                const { data } = await api.get(`/api/v1/profile/${username}`);
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
        return <div className="p-12 text-center text-gray-400">Loading Profile...</div>;
    }

    if (error || !profile) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-dark-900 p-6 h-full">
                <AlertTriangle className="w-16 h-16 text-gray-600 mb-4 opacity-50" />
                <h2 className="text-2xl font-bold text-white mb-2">{error || 'User Not Found'}</h2>
                <p className="text-gray-400 mb-6 font-mono text-sm max-w-md text-center">
                    The user you are looking for does not exist or has been removed.
                </p>
                <Link to="/" className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors">
                    Back to Home
                </Link>
            </div>
        );
    }

    const { user, stats } = profile;
    const isOwnProfile = authUser?.username === user.username;

    return (
        <div className="flex-1 overflow-y-auto bg-dark-900 code-scroll p-6 md:p-12">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Profile Header */}
                <div className="glass-panel p-8 relative overflow-hidden flex flex-col md:flex-row items-center md:items-start gap-6">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-400 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary-500/20">
                        <span className="text-4xl font-extrabold text-white">{user.username.charAt(0).toUpperCase()}</span>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-extrabold text-white mb-2">{user.username}</h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-400 font-medium font-mono">
                            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary-400" /> Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>

                    {isOwnProfile && (
                        <div className="shrink-0 mt-4 md:mt-0">
                            <Link to="/dashboard" className="px-5 py-2.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                <User className="w-4 h-4" /> Go to Dashboard
                            </Link>
                        </div>
                    )}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="glass-panel p-6 flex flex-col items-center justify-center transition-colors hover:bg-dark-800/40 border border-dark-700/50 hover:border-dark-600 group">
                        <CheckCircle className="w-6 h-6 text-green-400 mb-2 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                        <h3 className="text-3xl font-bold text-white mb-1 group-hover:text-green-400 transition-colors">{user.totalSolved}</h3>
                        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Problems Solved</p>
                    </div>
                    <div className="glass-panel p-6 flex flex-col items-center justify-center transition-colors hover:bg-dark-800/40 border border-dark-700/50 hover:border-dark-600 group">
                        <Trophy className="w-6 h-6 text-amber-400 mb-2 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                        <h3 className="text-3xl font-bold text-white mb-1 group-hover:text-amber-400 transition-colors">{user.totalScore}</h3>
                        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Total Score</p>
                    </div>
                </div>

                {/* Solved Problems Breakdown */}
                <div className="glass-panel p-8">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Code2 className="w-5 h-5 text-primary-400" /> Solved Problems
                    </h2>

                    <div className="space-y-8">
                        <DifficultySection title="Easy" data={stats.solvedByDifficulty.EASY} color="bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20" />
                        <DifficultySection title="Medium" data={stats.solvedByDifficulty.MEDIUM} color="bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20" />
                        <DifficultySection title="Hard" data={stats.solvedByDifficulty.HARD} color="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20" />
                    </div>

                    {stats.solvedByDifficulty.EASY.length === 0 && 
                     stats.solvedByDifficulty.MEDIUM.length === 0 && 
                     stats.solvedByDifficulty.HARD.length === 0 && (
                        <div className="text-center py-8 text-gray-500 font-mono text-sm border-t border-dark-700">
                            {user.username} hasn't solved any problems yet.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

const DifficultySection = ({ title, data, color }) => {
    if (!data || data.length === 0) return null;
    return (
        <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 border-b border-dark-700 pb-2">
                {title} <span className="ml-2 px-2 py-0.5 rounded bg-dark-700 text-gray-400 font-mono">{data.length}</span>
            </h3>
            <div className="flex flex-wrap gap-2">
                {data.map((problem) => (
                    <Link 
                        key={problem.slug} 
                        to={`/problems/${problem.slug}`}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors ${color}`}
                    >
                        {problem.title}
                    </Link>
                ))}
            </div>
        </div>
    );
};
