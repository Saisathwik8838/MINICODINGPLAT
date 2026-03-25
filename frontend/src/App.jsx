import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import CodeEditorPage from './pages/CodeEditorPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import DiscussionPage from './pages/DiscussionPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import useAuthStore from './store/authStore.js';
import { User, LogOut } from 'lucide-react';

function App() {
    const { user, isAuthenticated, checkSession, logout } = useAuthStore();

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    return (
        <BrowserRouter>
            <div className="min-h-screen flex flex-col bg-dark-900">
                {/* Navbar */}
                <nav className="h-14 border-b border-dark-700 bg-dark-800 flex items-center px-6 justify-between shrink-0 shadow-lg z-20">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.location.href = '/'}>
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg transform group-hover:scale-110 transition-transform">
                            {"</>"}
                        </div>
                        <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">
                            MiniLeetCode
                        </span>
                    </div>

                    <div className="flex gap-6 items-center">
                        <Link to="/problems/two-sum" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Problems</Link>
                        <Link to="/discuss" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Discuss</Link>
                        <Link to="/leaderboard" className="text-sm font-medium text-amber-500/80 hover:text-amber-400 transition-colors flex items-center gap-1">Leaderboard</Link>

                        {isAuthenticated ? (
                            <div className="flex items-center gap-4 pl-4 border-l border-dark-700">
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                    <div className="w-7 h-7 rounded-full bg-dark-600 flex items-center justify-center border border-dark-500">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium">{user.username}</span>
                                </div>
                                <button
                                    onClick={logout}
                                    className="p-1.5 rounded-lg hover:bg-error/10 text-gray-500 hover:text-error transition-all"
                                    title="Logout"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <Link to="/auth" className="px-4 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-400 text-white text-sm font-semibold transition-all shadow-lg shadow-primary-500/20">
                                Sign In
                            </Link>
                        )}
                    </div>
                </nav>

                {/* Content Route */}
                <main className="flex-1 flex overflow-hidden">
                    <Routes>
                        <Route path="/problems/:slug" element={<CodeEditorPage />} />
                        <Route path="/discuss" element={<DiscussionPage />} />
                        <Route path="/admin" element={<AdminPage />} />
                        <Route path="/leaderboard" element={<LeaderboardPage />} />
                        <Route path="/auth" element={<AuthPage />} />
                        {/* Redirect root to an example problem for testing the layout */}
                        <Route path="/" element={<Navigate to="/problems/two-sum" replace />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;
