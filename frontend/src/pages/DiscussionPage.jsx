import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, Clock, Code2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import useAuthStore from '../store/authStore.js';

export default function DiscussionPage() {
    const { user } = useAuthStore();
    const [discussions, setDiscussions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState('top');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showForm, setShowForm] = useState(false);
    
    // Form state
    const [problems, setProblems] = useState([]);
    const [formData, setFormData] = useState({ title: '', content: '', problemId: '' });
    const [submitting, setSubmitting] = useState(false);

    const fetchDiscussions = async (pageNum, sortType) => {
        setLoading(true);
        try {
            const { data } = await api.get(`/api/v1/discussions?page=${pageNum}&limit=10&sort=${sortType}`);
            setDiscussions(data.data.discussions || []);
            setTotalPages(data.data.pagination.totalPages);
            setPage(pageNum);
            setSort(sortType);
        } catch (error) {
            console.error('Failed to fetch discussions:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProblems = async () => {
        try {
            const { data } = await api.get('/api/v1/problems');
            setProblems(data.data.problems || []);
        } catch (error) {
            console.error('Failed to fetch problems', error);
        }
    };

    useEffect(() => {
        fetchDiscussions(1, 'top');
    }, []);

    const handleCreateClick = () => {
        if (!showForm && problems.length === 0) {
            fetchProblems();
        }
        setShowForm(!showForm);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.content || !formData.problemId) return;
        setSubmitting(true);
        try {
            await api.post(`/api/v1/problems/${formData.problemId}/discussions`, {
                title: formData.title,
                content: formData.content
            });
            setShowForm(false);
            setFormData({ title: '', content: '', problemId: '' });
            fetchDiscussions(1, sort);
        } catch (error) {
            console.error('Submission failed', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpvote = async (discussionId, problemId) => {
        if (!user) return alert('Please login to upvote');
        try {
            await api.post(`/problems/${problemId}/discussions/${discussionId}/upvote`);
            // Optimistically update
            setDiscussions(discussions.map(d => d.id === discussionId ? { ...d, upvotes: d.upvotes + 1 } : d));
        } catch (error) {
            console.error('Upvote failed', error);
        }
    };

    return (
        <div className="flex h-full w-full bg-dark-900 overflow-hidden relative">
            <div className="flex-1 overflow-y-auto px-6 py-6 md:px-12 max-w-5xl mx-auto code-scroll">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <MessageSquare className="w-8 h-8 text-primary-500" />
                            Global Discussions
                        </h1>
                        <p className="text-gray-400">Share your solutions, ask for help, or read top approaches across all problems.</p>
                    </div>
                    {user && (
                        <button onClick={handleCreateClick} className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors shadow-lg shadow-primary-500/20 flex items-center gap-2">
                            <Plus className="w-4 h-4"/> New Topic
                        </button>
                    )}
                </div>

                {/* Compose Form */}
                {showForm && user && (
                    <form onSubmit={handleSubmit} className="mb-8 p-6 glass-panel border-l-4 border-l-primary-500 animate-in fade-in slide-in-from-top-4">
                        <h3 className="text-lg font-bold text-white mb-4">Start a new discussion</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Select Problem</label>
                                <select required value={formData.problemId} onChange={e => setFormData({...formData, problemId: e.target.value})} className="w-full bg-dark-800 border border-dark-600 rounded p-2 text-white text-sm">
                                    <option value="" disabled>-- Choose a problem --</option>
                                    {problems.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Title</label>
                                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} type="text" className="w-full bg-dark-800 border border-dark-600 rounded p-2 text-white text-sm" placeholder="e.g. O(n) Runtime Solution Explained" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Content</label>
                                <textarea required value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} rows={5} className="w-full bg-dark-800 border border-dark-600 rounded p-2 text-white text-sm font-mono" placeholder="Write your approach or question here..." />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                            <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded text-sm font-medium disabled:opacity-50">Post Discussion</button>
                        </div>
                    </form>
                )}

                {/* Filters/Sorting */}
                <div className="flex items-center gap-4 mb-6 border-b border-dark-700 pb-4">
                    <div className="flex gap-2">
                        <button onClick={() => fetchDiscussions(1, 'top')} className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${sort === 'top' ? 'bg-dark-700 text-white border border-dark-600' : 'text-gray-400 hover:bg-dark-800'}`}>Top</button>
                        <button onClick={() => fetchDiscussions(1, 'recent')} className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${sort === 'recent' ? 'bg-dark-700 text-white border border-dark-600' : 'text-gray-400 hover:bg-dark-800'}`}>Recent</button>
                    </div>
                </div>

                {/* Discussion List */}
                <div className="space-y-4">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="glass-panel p-5 animate-pulse">
                                <div className="flex gap-5">
                                    <div className="w-12 h-16 bg-dark-700 rounded-lg shrink-0"></div>
                                    <div className="flex-1 space-y-3">
                                        <div className="h-5 bg-dark-700 w-3/4 rounded"></div>
                                        <div className="h-4 bg-dark-700 w-1/4 rounded"></div>
                                        <div className="h-4 bg-dark-800 w-full rounded mt-4"></div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : discussions.length === 0 ? (
                        <div className="text-center py-12 glass-panel">
                            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">No discussions found.</p>
                        </div>
                    ) : (
                        discussions.map((d) => (
                            <div key={d.id} className="glass-panel p-5 transition-transform hover:-translate-y-0.5 group border border-dark-700/50 hover:border-dark-600">
                                <div className="flex gap-5">
                                    {/* Vote Counter */}
                                    <div className="flex flex-col items-center gap-1 shrink-0 bg-dark-800/80 px-3 py-2 rounded-lg border border-dark-700/50 h-fit">
                                        <button onClick={() => handleUpvote(d.id, d.problemId)} className="text-gray-500 hover:text-primary-400 transition-colors">
                                            <ThumbsUp className="w-4 h-4" />
                                        </button>
                                        <span className="font-semibold text-gray-300">{d.upvotes}</span>
                                    </div>

                                    {/* Content block */}
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-200 group-hover:text-primary-400 transition-colors mb-2">
                                            {d.title}
                                        </h3>

                                        <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                                            {d.contentPreview}...
                                        </p>

                                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500 mb-3">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white bg-dark-600 font-bold uppercase">
                                                    {d.author.charAt(0)}
                                                </div>
                                                <span className="text-gray-300">{d.author}</span>
                                            </div>
                                            <Link to={`/problems/${d.problem?.slug}`} className="flex items-center gap-1 hover:text-primary-400 transition-colors text-primary-500/80">
                                                <Code2 className="w-3.5 h-3.5" />
                                                {d.problem?.title}
                                            </Link>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(d.createdAt).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                {d.commentCount} comments
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="flex justify-center mt-8 gap-2">
                        <button disabled={page === 1} onClick={() => fetchDiscussions(page - 1, sort)} className="px-4 py-2 rounded bg-dark-800 text-gray-300 hover:bg-dark-700 disabled:opacity-50 text-sm">Previous</button>
                        <span className="px-4 py-2 text-sm text-gray-400">Page {page} of {totalPages}</span>
                        <button disabled={page === totalPages} onClick={() => fetchDiscussions(page + 1, sort)} className="px-4 py-2 rounded bg-dark-800 text-gray-300 hover:bg-dark-700 disabled:opacity-50 text-sm">Next</button>
                    </div>
                )}
            </div>
        </div>
    );
}
