import { useState, useEffect } from 'react';
import { Users, Code2, Activity, PlaySquare, Plus, Trash2, Edit2, ShieldAlert, CheckCircle2, AlertCircle, RefreshCw, BarChart2, Wand2 } from 'lucide-react';
import api from '../api/axios.js';
import useAuthStore from '../store/authStore.js';

const AdminPage = () => {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState('overview');
    const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-dark-900">
            {/* Header */}
            <header className="shrink-0 border-b border-dark-700 bg-dark-800/50 px-8 py-6 backdrop-blur">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-100">
                            <ShieldAlert className="h-3.5 w-3.5 text-sky-300" />
                            Admin Only
                        </div>
                        <h1 className="mb-2 flex items-center gap-3 text-2xl font-bold text-white">
                            <ShieldAlert className="h-6 w-6 text-sky-300" />
                            Control the platform without mixing it with the solver flow.
                        </h1>
                        <p className="max-w-2xl text-sm text-gray-400">
                            This workspace is for content, users, submissions, and imports. Regular users stay in the
                            solving experience and cannot access these admin controls.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                        Signed in as <span className="font-semibold text-white">{user?.username || 'Admin'}</span>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="px-8 border-b border-dark-700 bg-dark-800/30 flex gap-6 shrink-0 z-10">
                {['overview', 'problems', 'testcases', 'users', 'submissions', 'import'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab 
                            ? 'border-purple-500 text-purple-400' 
                            : 'border-transparent text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        {tab === 'import' ? '📥 Import' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
                    toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="text-sm font-medium">{toast.message}</span>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 code-scroll">
                <div className="max-w-7xl mx-auto space-y-6">
                    {activeTab === 'overview' && <OverviewTab showToast={showToast} />}
                    {activeTab === 'problems' && <ProblemsTab showToast={showToast} />}
                    {activeTab === 'testcases' && <TestCasesTab showToast={showToast} />}
                    {activeTab === 'users' && <UsersTab showToast={showToast} />}
                    {activeTab === 'submissions' && <SubmissionsTab showToast={showToast} />}
                    {activeTab === 'import' && <ImportTab showToast={showToast} />}
                </div>
            </div>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/*                                OVERVIEW TAB                                */
/* -------------------------------------------------------------------------- */

const OverviewTab = ({ showToast }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await api.get('/admin/stats');
                setStats(data.data);
            } catch (err) {
                showToast('Failed to load stats', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <SkeletonCards count={4} />;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Users" value={stats?.totalUsers || 0} icon={<Users className="w-5 h-5" />} color="text-blue-400" />
            <StatCard title="Total Problems" value={stats?.totalProblems || 0} icon={<Code2 className="w-5 h-5" />} color="text-purple-400" />
            <StatCard title="Total Submissions" value={stats?.totalSubmissions || 0} icon={<PlaySquare className="w-5 h-5" />} color="text-green-400" />
            <StatCard title="Queue Status" value={stats?.queueStatus || 0} icon={<Activity className="w-5 h-5" />} color="text-amber-400" />
        </div>
    );
};

const StatCard = ({ title, value, icon, color }) => (
    <div className="glass-panel p-6 flex items-center justify-between">
        <div>
            <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-white">{value.toLocaleString()}</h3>
        </div>
        <div className={`w-12 h-12 rounded-xl bg-dark-700 flex items-center justify-center ${color}`}>
            {icon}
        </div>
    </div>
);

/* -------------------------------------------------------------------------- */
/*                                PROBLEMS TAB                                */
/* -------------------------------------------------------------------------- */

const ProblemsTab = ({ showToast }) => {
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [generatingMap, setGeneratingMap] = useState({});
    const [problems, setProblems] = useState([]);

    const [formData, setFormData] = useState({
        title: '', slug: '', description: '', difficulty: 'EASY', timeLimit: 5, memoryLimit: 256, isActive: true
    });

    const fetchProblems = async (pageNum = 1) => {
        setLoading(true);
        try {
            const { data } = await api.get(`/admin/problems?page=${pageNum}&limit=20&search=${searchTerm}`);
            setProblems(data.data.problems || []);
            setTotalPages(data.data.pagination?.totalPages || 1);
            setPage(pageNum);
        } catch (err) {
            showToast('Failed to fetch problems', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProblems(1); }, [searchTerm]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            const up = { ...prev, [name]: type === 'checkbox' ? checked : value };
            if (name === 'title' && !editingId) {
                up.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            }
            return up;
        });
    };

    const handleEdit = (p) => {
        setEditingId(p.id);
        setFormData({ ...p });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this problem?')) return;
        try {
            await api.delete(`/admin/problems/${id}`);
            showToast('Problem deleted successfully');
            fetchProblems();
        } catch (err) {
            showToast('Failed to delete problem', 'error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, timeLimit: parseFloat(formData.timeLimit), memoryLimit: parseInt(formData.memoryLimit) };
            if (editingId) {
                await api.patch(`/admin/problems/${editingId}`, payload);
                showToast('Problem updated');
            } else {
                await api.post('/admin/problems', payload);
                showToast('Problem created');
            }
            setShowForm(false);
            setEditingId(null);
            fetchProblems();
        } catch (err) {
            showToast(err.response?.data?.message || 'Save failed', 'error');
        }
    };

    const handleGenerate = async (id) => {
        setGeneratingMap({ ...generatingMap, [id]: true });
        try {
            await api.post(`/admin/problems/${id}/generate-testcases`);
            showToast('Test cases generated successfully ✓');
        } catch (err) {
            showToast(err.response?.data?.message || 'Generation failed', 'error');
        } finally {
            setGeneratingMap({ ...generatingMap, [id]: false });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl font-bold text-white whitespace-nowrap">Problem Library</h2>
                <div className="flex w-full md:w-auto gap-3">
                    <input 
                        type="text" 
                        placeholder="Search title or slug..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 md:w-64 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none transition-colors"
                    />
                    <button onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ title: '', slug: '', description: '', difficulty: 'EASY', timeLimit: 5, memoryLimit: 256, isActive: true }); }} className="shrink-0 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                        <Plus className="w-4 h-4" /> New Problem
                    </button>
                </div>
            </div>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="glass-panel p-6 space-y-4 border-l-4 border-l-primary-500">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-gray-400">Title</label><input required name="title" value={formData.title} onChange={handleChange} className="w-full bg-dark-700/50 border border-dark-600 rounded p-2 text-white text-sm" /></div>
                        <div><label className="text-xs text-gray-400">Slug</label><input required name="slug" value={formData.slug} onChange={handleChange} className="w-full bg-dark-700/50 border border-dark-600 rounded p-2 text-white text-sm" /></div>
                        <div className="col-span-2"><label className="text-xs text-gray-400">Description (Markdown)</label><textarea required rows={5} name="description" value={formData.description} onChange={handleChange} className="w-full bg-dark-700/50 border border-dark-600 rounded p-2 text-white text-sm font-mono" /></div>
                        <div>
                            <label className="text-xs text-gray-400">Difficulty</label>
                            <select name="difficulty" value={formData.difficulty} onChange={handleChange} className="w-full bg-dark-700/50 border border-dark-600 rounded p-2 text-white text-sm">
                                <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
                            </select>
                        </div>
                        <div><label className="text-xs text-gray-400">Time Limit (s)</label><input type="number" step="0.1" required name="timeLimit" value={formData.timeLimit} onChange={handleChange} className="w-full bg-dark-700/50 border border-dark-600 rounded p-2 text-white text-sm" /></div>
                        <div><label className="text-xs text-gray-400">Memory Limit (MB)</label><input type="number" required name="memoryLimit" value={formData.memoryLimit} onChange={handleChange} className="w-full bg-dark-700/50 border border-dark-600 rounded p-2 text-white text-sm" /></div>
                        <div className="flex items-center gap-2 mt-6">
                            <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="w-4 h-4" />
                            <label className="text-sm text-gray-300">Is Active (Visible to users)</label>
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end mt-4">
                        <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium">Save Problem</button>
                    </div>
                </form>
            )}

            <div className="glass-panel overflow-hidden">
                <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-dark-800/80 text-xs uppercase text-gray-500 font-semibold border-b border-dark-700">
                        <tr><th className="px-6 py-4">Title</th><th className="px-6 py-4">Difficulty</th><th className="px-6 py-4">Limits</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700">
                        {loading ? <TableSkeleton cols={5} rows={5} /> : problems.length === 0 ? <EmptyState icon={<Code2/>} text="No problems found." /> : problems.map(p => (
                            <tr key={p.id} className="hover:bg-dark-800/30 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-200">{p.title}<div className="text-xs text-gray-500 font-mono mt-1">{p.slug}</div></td>
                                <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${p.difficulty === 'EASY' ? 'bg-green-500/10 text-green-400' : p.difficulty === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{p.difficulty}</span></td>
                                <td className="px-6 py-4"><div className="text-xs">{p.timeLimit}s</div><div className="text-xs text-gray-500">{p.memoryLimit}MB</div></td>
                                <td className="px-6 py-4">{p.isActive ? <span className="text-green-400 flex items-center gap-1 text-xs"><CheckCircle2 className="w-3 h-3"/> Active</span> : <span className="text-gray-500 flex items-center gap-1 text-xs"><AlertCircle className="w-3 h-3"/> Draft</span>}</td>
                                <td className="px-6 py-4 text-right space-x-3">
                                    <button disabled={generatingMap[p.id]} onClick={() => handleGenerate(p.id)} title="Generate Test Cases" className="text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50">
                                        {generatingMap[p.id] ? <RefreshCw className="w-4 h-4 inline animate-spin" /> : <Wand2 className="w-4 h-4 inline" />}
                                    </button>
                                    <button onClick={() => handleEdit(p)} className="text-primary-400 hover:text-primary-300 transition-colors"><Edit2 className="w-4 h-4 inline" /></button>
                                    <button onClick={() => handleDelete(p.id)} className="text-error hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4 inline" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {!loading && totalPages > 1 && (
                    <div className="p-4 border-t border-dark-700 bg-dark-800/50 flex justify-between items-center">
                        <button disabled={page === 1} onClick={() => fetchProblems(page - 1)} className="px-3 py-1 bg-dark-700 rounded text-sm text-white disabled:opacity-50">Previous</button>
                        <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
                        <button disabled={page === totalPages} onClick={() => fetchProblems(page + 1)} className="px-3 py-1 bg-dark-700 rounded text-sm text-white disabled:opacity-50">Next</button>
                    </div>
                )}
            </div>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/*                               TEST CASES TAB                               */
/* -------------------------------------------------------------------------- */

const TestCasesTab = ({ showToast }) => {
    const [problems, setProblems] = useState([]);
    const [selectedProblem, setSelectedProblem] = useState('');
    const [testCases, setTestCases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    
    const [formData, setFormData] = useState({ input: '', expectedOutput: '', isHidden: false });

    useEffect(() => {
        api.get('/admin/problems').then(res => {
            setProblems(res.data.data.problems || []);
            if (res.data.data.problems.length > 0) {
                setSelectedProblem(res.data.data.problems[0].id);
            }
        });
    }, []);    
    
    const fetchTestCases = (id) => {
        setLoading(true);
        api.get(`/admin/problems/${id}/testcases`).then(res => {
            setTestCases(res.data.data.testCases || []);
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!selectedProblem) return;
        fetchTestCases(selectedProblem);
    }, [selectedProblem]);

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/admin/problems/${selectedProblem}/testcases`, formData);
            showToast('Testcase added');
            setFormData({ input: '', expectedOutput: '', isHidden: false });
            fetchTestCases(selectedProblem);
        } catch (err) {
            showToast('Failed to add Testcase', 'error');
        }
    };

    const handleDelete = async (tcId) => {
        if (!confirm('Delete this testcase?')) return;
        try {
            await api.delete(`/admin/problems/${selectedProblem}/testcases/${tcId}`);
            setTestCases(testCases.filter(t => t.id !== tcId));
            showToast('Deleted');
        } catch (err) {
            showToast('Delete failed', 'error');
        }
    };

    const handleRegenerate = async () => {
        if (!selectedProblem) return;
        setRegenerating(true);
        try {
            await api.post(`/admin/problems/${selectedProblem}/regenerate-testcases`);
            showToast('Regenerated successfully ✓');
            fetchTestCases(selectedProblem);
        } catch (err) {
            showToast(err.response?.data?.message || 'Regeneration failed', 'error');
        } finally {
            setRegenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="glass-panel p-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Problem to Manage Testcases</label>
                <select value={selectedProblem} onChange={(e) => setSelectedProblem(e.target.value)} className="w-full lg:w-1/2 bg-dark-800 border border-dark-600 rounded-lg p-3 text-white">
                    {problems.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 glass-panel p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Add Test Case</h3>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-400">Input</label>
                            <textarea required rows={4} value={formData.input} onChange={e => setFormData({...formData, input: e.target.value})} className="w-full bg-dark-800 border border-dark-600 rounded p-2 text-white font-mono text-sm" placeholder="e.g. nums = [2,7,11,15]\ntarget = 9" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400">Expected Output</label>
                            <textarea required rows={2} value={formData.expectedOutput} onChange={e => setFormData({...formData, expectedOutput: e.target.value})} className="w-full bg-dark-800 border border-dark-600 rounded p-2 text-white font-mono text-sm" placeholder="e.g. [0,1]" />
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={formData.isHidden} onChange={e => setFormData({...formData, isHidden: e.target.checked})} className="w-4 h-4" />
                            <label className="text-sm text-gray-300">Hidden (Used for evaluation only)</label>
                        </div>
                        <button type="submit" className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium">Add to Problem</button>
                    </form>
                </div>

                <div className="lg:col-span-2 glass-panel overflow-hidden">
                    <div className="px-6 py-4 border-b border-dark-700 bg-dark-800/50 flex justify-between items-center">
                        <h3 className="font-semibold text-white">Existing Test Cases ({testCases.length})</h3>
                        <button disabled={regenerating || !selectedProblem} onClick={handleRegenerate} className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-indigo-400 text-xs font-medium rounded transition-colors disabled:opacity-50 border border-dark-600">
                            {regenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Regenerate All
                        </button>
                    </div>
                    <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto code-scroll">
                        {loading ? <SkeletonCards count={3} /> : testCases.length === 0 ? <EmptyState icon={<Code2/>} text="No testcases yet." /> : testCases.map((tc, idx) => (
                            <div key={tc.id} className="bg-dark-800 border border-dark-600 rounded-lg p-4 relative group">
                                <span className="absolute top-4 right-12 px-2 py-0.5 rounded text-xs bg-dark-700 text-gray-400">Order: {tc.order}</span>
                                {tc.isHidden && <span className="absolute top-4 right-24 px-2 py-0.5 rounded text-xs bg-purple-500/10 text-purple-400">Hidden</span>}
                                <button onClick={() => handleDelete(tc.id)} className="absolute top-4 right-4 text-gray-500 hover:text-error transition-colors"><Trash2 className="w-4 h-4" /></button>
                                
                                <div className="text-sm text-primary-400 font-semibold mb-2">Test Case #{idx + 1}</div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><div className="text-xs text-gray-500 mb-1">Input</div><p className="font-mono text-sm text-gray-300 whitespace-pre-wrap bg-dark-900 p-2 rounded">{tc.input}</p></div>
                                    <div><div className="text-xs text-gray-500 mb-1">Expected</div><p className="font-mono text-sm text-gray-300 whitespace-pre-wrap bg-dark-900 p-2 rounded">{tc.expectedOutput}</p></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/*                                USERS TAB                                   */
/* -------------------------------------------------------------------------- */

const UsersTab = ({ showToast }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = () => {
        setLoading(true);
        api.get('/admin/users').then(res => {
            setUsers(res.data.data.users || []);
        }).finally(() => setLoading(false));
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleRoleChange = async (userId, currentRole) => {
        const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
        if (!confirm(`Change user role to ${newRole}?`)) return;
        try {
            await api.patch(`/admin/users/${userId}/role`, { role: newRole });
            showToast('Role updated successfully');
            fetchUsers();
        } catch (err) {
            showToast('Failed to update role', 'error');
        }
    };

    return (
        <div className="glass-panel overflow-hidden">
            <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-dark-800/80 text-xs uppercase text-gray-500 font-semibold border-b border-dark-700">
                    <tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Role / Action</th><th className="px-6 py-4">Solved</th><th className="px-6 py-4">Joined At</th></tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                    {loading ? <TableSkeleton cols={4} rows={5} /> : users.map(u => (
                        <tr key={u.id} className="hover:bg-dark-800/30 transition-colors">
                            <td className="px-6 py-4">
                                <div className="font-medium text-gray-200">{u.username}</div>
                                <div className="text-xs text-gray-500">{u.email}</div>
                            </td>
                            <td className="px-6 py-4">
                                <button onClick={() => handleRoleChange(u.id, u.role)} className={`px-2 py-1 rounded text-xs font-bold transition-transform hover:scale-105 ${u.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-gray-700 text-gray-300'}`}>
                                    {u.role}
                                </button>
                            </td>
                            <td className="px-6 py-4 font-mono text-primary-400">{u.totalSolved}</td>
                            <td className="px-6 py-4 text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/*                            SUBMISSIONS TAB                                 */
/* -------------------------------------------------------------------------- */

const SubmissionsTab = ({ showToast }) => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchSubmissions = (pageNum) => {
        setLoading(true);
        api.get(`/admin/submissions?page=${pageNum}&limit=20`).then(res => {
            setSubmissions(res.data.data.submissions || []);
            setTotalPages(res.data.data.pagination.totalPages);
            setPage(pageNum);
        }).catch(() => showToast('Failed to load submissions', 'error'))
          .finally(() => setLoading(false));
    };

    useEffect(() => { fetchSubmissions(1); }, []);

    const getStatusColor = (status) => {
        const map = {
            ACCEPTED: 'bg-green-500/10 text-green-400 border-green-500/20',
            WRONG_ANSWER: 'bg-red-500/10 text-red-400 border-red-500/20',
            TIME_LIMIT_EXCEEDED: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
            RUNTIME_ERROR: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
            COMPILATION_ERROR: 'bg-gray-700 text-gray-300',
            PENDING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            PROCESSING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            INTERNAL_ERROR: 'bg-red-900/40 text-red-300 border-red-800',
        };
        return map[status] || 'bg-gray-800 text-white';
    };

    return (
        <div className="glass-panel overflow-hidden flex flex-col">
            <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-dark-800/80 text-xs uppercase text-gray-500 font-semibold border-b border-dark-700">
                    <tr><th className="px-6 py-4">Time</th><th className="px-6 py-4">User</th><th className="px-6 py-4">Problem</th><th className="px-6 py-4">Lang</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Runtime</th></tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                    {loading ? <TableSkeleton cols={6} rows={10} /> : submissions.length === 0 ? <EmptyState icon={<BarChart2/>} text="No submissions recorded." /> : submissions.map(s => (
                        <tr key={s.id} className="hover:bg-dark-800/30 transition-colors">
                            <td className="px-6 py-3 text-xs text-gray-500">{new Date(s.createdAt).toLocaleString()}</td>
                            <td className="px-6 py-3 font-medium text-gray-300">{s.user.username}</td>
                            <td className="px-6 py-3 text-primary-400">{s.problem.title}</td>
                            <td className="px-6 py-3"><span className="px-2 py-1 bg-dark-700 rounded text-xs text-gray-300 font-mono">{s.language}</span></td>
                            <td className="px-6 py-3"><span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusColor(s.status)}`}>{s.status.replace(/_/g, ' ')}</span></td>
                            <td className="px-6 py-3 text-right font-mono text-gray-400">{s.runtime ? `${s.runtime}ms` : '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            {!loading && totalPages > 1 && (
                <div className="p-4 border-t border-dark-700 bg-dark-800/50 flex justify-between items-center">
                    <button disabled={page === 1} onClick={() => fetchSubmissions(page - 1)} className="px-3 py-1 bg-dark-700 rounded text-sm text-white disabled:opacity-50">Previous</button>
                    <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
                    <button disabled={page === totalPages} onClick={() => fetchSubmissions(page + 1)} className="px-3 py-1 bg-dark-700 rounded text-sm text-white disabled:opacity-50">Next</button>
                </div>
            )}
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/*                                IMPORT TAB                                  */
/* -------------------------------------------------------------------------- */

const ImportTab = ({ showToast }) => {
    const [split, setSplit] = useState('train');
    const [limit, setLimit] = useState(100);
    const [skipExisting, setSkipExisting] = useState(true);
    const [overwrite, setOverwrite] = useState(false);
    
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [previewing, setPreviewing] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    const fetchStats = async () => {
        setLoadingStats(true);
        try {
            const { data } = await api.get('/admin/leetcode/stats');
            setStats(data.data);
        } catch (err) {
            showToast('Failed to load stats', 'error');
        } finally {
            setLoadingStats(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handlePreview = async () => {
        setPreviewing(true);
        setPreviewData(null);
        setImportResult(null);
        try {
            const { data } = await api.post('/admin/leetcode/preview', { limit: Number(limit) });
            setPreviewData(data.data);
            showToast('Preview generated successfully');
        } catch (err) {
            showToast(err.response?.data?.message || 'Preview failed', 'error');
        } finally {
            setPreviewing(false);
        }
    };

    const handleImport = async () => {
        setImporting(true);
        setImportResult(null);
        try {
            const endpoint = split === 'train' ? '/admin/leetcode/import' : '/admin/leetcode/import-test';
            const payload = { 
                limit: Number(limit),
                skipExisting: overwrite ? false : skipExisting,
                overwrite
            };
            
            const { data } = await api.post(endpoint, payload);
            setImportResult(data.data);
            showToast('Import completed successfully');
            fetchStats();
            setPreviewData(null); // Clear preview after import
        } catch (err) {
            showToast(err.response?.data?.message || 'Import failed', 'error');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* SECTION 1: Stats */}
            <div className="glass-panel p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Database Stats</h2>
                    <button onClick={fetchStats} className="text-gray-400 hover:text-white transition-colors" disabled={loadingStats}>
                        <RefreshCw className={`w-5 h-5 ${loadingStats ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-dark-800 rounded p-4 border border-dark-600">
                        <div className="text-sm text-gray-400">Total Problems</div>
                        <div className="text-2xl font-bold text-white mt-1">{stats?.totalProblems || 0}</div>
                    </div>
                    <div className="bg-dark-800 rounded p-4 border border-green-500/20">
                        <div className="text-sm text-green-400">Easy</div>
                        <div className="text-2xl font-bold text-white mt-1">{stats?.byDifficulty?.EASY || 0}</div>
                    </div>
                    <div className="bg-dark-800 rounded p-4 border border-amber-500/20">
                        <div className="text-sm text-amber-400">Medium</div>
                        <div className="text-2xl font-bold text-white mt-1">{stats?.byDifficulty?.MEDIUM || 0}</div>
                    </div>
                    <div className="bg-dark-800 rounded p-4 border border-red-500/20">
                        <div className="text-sm text-red-400">Hard</div>
                        <div className="text-2xl font-bold text-white mt-1">{stats?.byDifficulty?.HARD || 0}</div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: Import Config */}
            <div className="glass-panel p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Import Configuration</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Split</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-sm text-gray-400">
                                    <input type="radio" value="train" checked={split === 'train'} onChange={() => setSplit('train')} className="text-primary-500 bg-dark-700" />
                                    Train (2,641 problems)
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-400">
                                    <input type="radio" value="test" checked={split === 'test'} onChange={() => setSplit('test')} className="text-primary-500 bg-dark-700" />
                                    Test (228 problems)
                                </label>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Train split recommended for main problem bank. Test split for harder evaluation problems.</p>
                        </div>
                        {split === 'train' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Max problems to import</label>
                                <input type="number" min="1" max="2641" value={limit} onChange={(e) => setLimit(e.target.value)} className="w-full bg-dark-800 border border-dark-600 rounded p-2 text-white text-sm" />
                            </div>
                        )}
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="flex items-center gap-3 p-3 bg-dark-800 border border-dark-600 rounded-lg cursor-pointer">
                                <input type="checkbox" checked={!overwrite && skipExisting} disabled={overwrite} onChange={(e) => setSkipExisting(e.target.checked)} className="w-4 h-4 text-primary-500 rounded bg-dark-700 border-dark-600" />
                                <div>
                                    <div className="text-sm font-medium text-white">Skip existing problems</div>
                                    <div className="text-xs text-gray-400">Problems already in DB won't be re-imported</div>
                                </div>
                            </label>
                        </div>
                        <div>
                            <label className="flex items-center gap-3 p-3 bg-dark-800 border border-dark-600 rounded-lg cursor-pointer">
                                <input type="checkbox" checked={overwrite} onChange={(e) => {
                                    setOverwrite(e.target.checked);
                                    if (e.target.checked) setSkipExisting(false);
                                }} className="w-4 h-4 text-primary-500 rounded bg-dark-700 border-dark-600" />
                                <div>
                                    <div className="text-sm font-medium text-white">Overwrite existing</div>
                                    <div className="text-xs text-gray-400">Replace existing problem data and test cases</div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 3: Preview */}
            <div className="glass-panel p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Preview Panel</h3>
                    <button onClick={handlePreview} disabled={previewing || importing} className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                        {previewing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                        Preview (no DB changes)
                    </button>
                </div>
                
                {previewData && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex gap-4">
                            <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded text-sm">✓ {previewData.willCreate} new problems will be created</span>
                            <span className="px-3 py-1 bg-gray-700/50 text-gray-400 border border-gray-600 rounded text-sm">→ {previewData.willSkip} existing problems will be skipped</span>
                            <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded text-sm">📝 {previewData.totalTestCases} total test cases</span>
                        </div>
                        
                        <div className="overflow-hidden bg-dark-800 border border-dark-700 rounded-lg">
                            <table className="w-full text-left text-sm text-gray-300">
                                <thead className="bg-dark-900/50 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3">Title</th>
                                        <th className="px-4 py-3">Difficulty</th>
                                        <th className="px-4 py-3">Test Cases</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-700">
                                    {previewData.sample.map((p, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-3 text-white">{p.title}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${p.difficulty === 'EASY' ? 'bg-green-500/10 text-green-400' : p.difficulty === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    {p.difficulty}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-mono">{previewData.totalTestCases > 0 ? '✓' : 'None'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* SECTION 4: Import Action */}
            <div className="glass-panel p-6 border-t-2 border-primary-500">
                <button 
                    onClick={handleImport} 
                    disabled={!previewData || importing} 
                    className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                    {importing ? (
                        <><RefreshCw className="w-6 h-6 animate-spin" /> Importing... this may take a minute</>
                    ) : (
                        <><Wand2 className="w-6 h-6" /> Import {split === 'train' ? limit : 228} Problems from LeetCode Dataset</>
                    )}
                </button>

                {importResult && (
                    <div className="mt-6 grid grid-cols-3 gap-4 animate-in fade-in zoom-in-95">
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex flex-col items-center justify-center">
                            <div className="text-2xl font-bold text-green-400">{importResult.created}</div>
                            <div className="text-sm text-gray-400">Created</div>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center">
                            <div className="text-2xl font-bold text-gray-300">{importResult.skipped}</div>
                            <div className="text-sm text-gray-400">Skipped</div>
                        </div>
                        {importResult.failed > 0 && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex flex-col items-center justify-center">
                                <div className="text-2xl font-bold text-red-400">{importResult.failed}</div>
                                <div className="text-sm text-red-500">Failed</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/*                                SHARED UI                                   */
/* -------------------------------------------------------------------------- */

const SkeletonCards = ({ count }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="glass-panel p-6 animate-pulse">
                <div className="h-4 bg-dark-700 rounded w-1/2 mb-3"></div>
                <div className="h-8 bg-dark-600 rounded w-1/3"></div>
            </div>
        ))}
    </div>
);

const TableSkeleton = ({ cols, rows }) => (
    <>
        {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="animate-pulse border-b border-dark-700/50">
                {Array.from({ length: cols }).map((_, j) => (
                    <td key={j} className="px-6 py-4"><div className="h-4 bg-dark-700 rounded w-3/4"></div></td>
                ))}
            </tr>
        ))}
    </>
);

const EmptyState = ({ icon, text }) => (
    <tr>
        <td colSpan="100%" className="px-6 py-12 text-center text-gray-500">
            <div className="flex flex-col items-center justify-center gap-3">
                <div className="p-4 rounded-full bg-dark-800 text-gray-600">{icon}</div>
                <p className="text-sm">{text}</p>
            </div>
        </td>
    </tr>
);

export default AdminPage;
