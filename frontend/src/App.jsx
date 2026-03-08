import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import CodeEditorPage from './pages/CodeEditorPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import DiscussionPage from './pages/DiscussionPage.jsx';

// Basic routing setup
function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen flex flex-col">
                {/* Simple Navbar */}
                <nav className="h-14 border-b border-dark-700 bg-dark-800 flex items-center px-6 justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">
                            {"</>"}
                        </div>
                        <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">
                            MiniLeetCode
                        </span>
                    </div>
                    <div className="flex gap-4 items-center">
                        <Link to="/problems/two-sum" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Problems</Link>
                        <Link to="/discuss" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Discuss</Link>
                        <Link to="/admin" className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors">Admin Panel</Link>
                        <Link to="/leaderboard" className="text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1">Leaderboard</Link>
                        <button className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Sign In</button>
                    </div>
                </nav>

                {/* Content Route */}
                <main className="flex-1 flex overflow-hidden">
                    <Routes>
                        <Route path="/problems/:slug" element={<CodeEditorPage />} />
                        <Route path="/discuss" element={<DiscussionPage />} />
                        <Route path="/admin" element={<AdminPage />} />
                        <Route path="/leaderboard" element={<LeaderboardPage />} />
                        {/* Redirect root to an example problem for testing the layout */}
                        <Route path="/" element={<Navigate to="/problems/two-sum" replace />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;
