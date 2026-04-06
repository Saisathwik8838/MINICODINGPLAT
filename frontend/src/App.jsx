import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, NavLink, useNavigate } from 'react-router-dom';
import CodeEditorPage from './pages/CodeEditorPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import DiscussionPage from './pages/DiscussionPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ProblemsListPage from './pages/ProblemsListPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import useAuthStore from './store/authStore.js';
import { User, LogOut, Loader2, ShieldCheck, SquareTerminal, Target } from 'lucide-react';

const renderRouteClass = ({ isActive }) =>
    `nav-link ${isActive ? 'nav-link-active' : ''}`;

const FullPageLoader = () => (
    <div className="flex flex-1 items-center justify-center">
        <div className="surface-card flex items-center gap-3 px-5 py-4 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-sky-300" />
            Loading workspace...
        </div>
    </div>
);

const getDefaultPath = (isAuthenticated, user) => {
    if (!isAuthenticated) return '/';
    return user?.role === 'ADMIN' ? '/admin' : '/';
};

// Protected Route Wrapper
const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const { isAuthenticated, user, loading } = useAuthStore();
    
    if (loading) return <FullPageLoader />;
    
    if (!isAuthenticated) return <Navigate to="/auth" replace />;
    
    if (requireAdmin && user?.role !== 'ADMIN') return <Navigate to="/" replace />;
    
    return children;
};

// Public Route Wrapper (redirects logged in user away from auth page)
const PublicRoute = ({ children }) => {
    const { isAuthenticated, user, loading } = useAuthStore();
    
    if (loading) return <FullPageLoader />;
    
    if (isAuthenticated) return <Navigate to={getDefaultPath(isAuthenticated, user)} replace />;
    
    return children;
};

const HomeRoute = () => {
    const { isAuthenticated, user, loading } = useAuthStore();

    if (loading) return <FullPageLoader />;
    if (isAuthenticated && user?.role === 'ADMIN') return <Navigate to="/admin" replace />;

    return <ProblemsListPage />;
};

const DashboardRoute = () => {
    const { user } = useAuthStore();

    if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;

    return <DashboardPage />;
};

function AppShell() {
    const { user, isAuthenticated, checkSession, logout } = useAuthStore();
    const navigate = useNavigate();
    const isAdmin = isAuthenticated && user?.role === 'ADMIN';
    const homePath = isAdmin ? '/admin' : '/';
    const roleBadge = isAdmin
        ? {
            icon: <ShieldCheck className="h-3.5 w-3.5 text-sky-300" />,
            label: 'Admin Workspace',
            tone: 'text-sky-100'
        }
        : {
            icon: <Target className="h-3.5 w-3.5 text-emerald-300" />,
            label: 'Solver Mode',
            tone: 'text-emerald-100'
        };

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    const handleLogout = async () => {
        await logout();
        navigate('/auth', { replace: true });
    };

    return (
        <div className="app-shell">
            {/* Navbar */}
            <nav className="topbar sticky top-0 z-30 shrink-0 px-4 md:px-6">
                <div className="mx-auto flex min-h-[72px] w-full max-w-7xl flex-wrap items-center justify-between gap-3 py-3">
                    <Link to={homePath} className="group flex items-center gap-3">
                        <div className="brand-mark transition-transform duration-300 group-hover:scale-105">
                            <SquareTerminal className="h-5 w-5" />
                        </div>
                        <div>
                            <span className="display-font block text-lg font-bold tracking-tight text-white">
                                MiniLeetCode
                            </span>
                            <span className="hidden text-xs font-medium uppercase tracking-[0.22em] text-slate-400 md:block">
                                Code. Run. Refine.
                            </span>
                        </div>
                    </Link>

                    <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3">
                        {isAdmin ? (
                            <>
                                <NavLink to="/admin" className={renderRouteClass}>
                                    Admin Console
                                </NavLink>
                                <NavLink to="/problems" className={renderRouteClass}>
                                    Preview Problems
                                </NavLink>
                            </>
                        ) : (
                            <>
                                <NavLink to="/problems" className={renderRouteClass}>
                                    Problems
                                </NavLink>
                                <NavLink to="/discuss" className={renderRouteClass}>
                                    Discuss
                                </NavLink>
                                <NavLink to="/leaderboard" className={renderRouteClass}>
                                    Leaderboard
                                </NavLink>
                            </>
                        )}

                        {isAuthenticated && !isAdmin && (
                            <NavLink to="/dashboard" className={renderRouteClass}>
                                Dashboard
                            </NavLink>
                        )}

                        {isAuthenticated ? (
                            <div className="ml-1 flex items-center gap-2 border-l border-white/10 pl-3">
                                <div className={`hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold lg:flex ${roleBadge.tone}`}>
                                    {roleBadge.icon}
                                    {roleBadge.label}
                                </div>
                                <Link
                                    to={`/profile/${user.username}`}
                                    className="secondary-button px-3 py-2"
                                >
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <span className="max-w-[108px] truncate">{user.username}</span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="secondary-button px-3 py-2 text-slate-400 hover:text-rose-300"
                                    title="Logout"
                                >
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="ml-1 border-l border-white/10 pl-3">
                                <Link to="/auth" className="primary-button">
                                    Sign In
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Content Route */}
            <main className="flex flex-1 overflow-hidden">
                <Routes>
                    <Route path="/" element={<HomeRoute />} />
                    <Route path="/problems" element={<ProblemsListPage />} />
                    <Route path="/problems/:slug" element={<CodeEditorPage />} />
                    <Route path="/discuss" element={<DiscussionPage />} />
                    <Route path="/leaderboard" element={<LeaderboardPage />} />
                    <Route path="/profile/:username" element={<ProfilePage />} />
                    
                    <Route path="/dashboard" element={
                        <ProtectedRoute>
                            <DashboardRoute />
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/admin" element={
                        <ProtectedRoute requireAdmin={true}>
                            <AdminPage />
                        </ProtectedRoute>
                    } />

                    <Route path="/auth" element={
                        <PublicRoute>
                            <AuthPage />
                        </PublicRoute>
                    } />
                    
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AppShell />
        </BrowserRouter>
    );
}

export default App;
