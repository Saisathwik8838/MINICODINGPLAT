import React, { useEffect, useState } from 'react';
import { Clock, Code2, MessageSquare, Plus, ThumbsUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import useAuthStore from '../store/authStore.js';

const sortOptions = [
    { id: 'top', label: 'Top' },
    { id: 'recent', label: 'Recent' }
];

export default function DiscussionPage() {
    const { user } = useAuthStore();
    const [discussions, setDiscussions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState('top');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [problems, setProblems] = useState([]);
    const [formData, setFormData] = useState({ title: '', content: '', problemId: '' });
    const [submitting, setSubmitting] = useState(false);

    const fetchDiscussions = async (pageNum, sortType) => {
        setLoading(true);

        try {
            const { data } = await api.get(`/discussions?page=${pageNum}&limit=10&sort=${sortType}`);
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
            const { data } = await api.get('/problems');
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
            await api.post(`/problems/${formData.problemId}/discussions`, {
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
        if (!user) {
            alert('Please login to upvote');
            return;
        }

        try {
            await api.post(`/problems/${problemId}/discussions/${discussionId}/upvote`);
            setDiscussions(
                discussions.map((discussion) =>
                    discussion.id === discussionId
                        ? { ...discussion, upvotes: discussion.upvotes + 1 }
                        : discussion
                )
            );
        } catch (error) {
            console.error('Upvote failed', error);
        }
    };

    return (
        <div className="page-shell code-scroll">
            <div className="ambient-orb ambient-orb-cyan right-[5%] top-[40px] h-72 w-72" />
            <div className="ambient-orb ambient-orb-amber left-[-80px] top-[260px] h-80 w-80" />

            <div className="page-width max-w-5xl space-y-6">
                <section className="hero-panel section-fade">
                    <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-3xl">
                            <span className="kicker mb-4">Community</span>
                            <h1 className="flex items-center gap-3 text-3xl font-bold text-white md:text-4xl">
                                <MessageSquare className="h-8 w-8 text-sky-300" />
                                Discussions that feel part of the product.
                            </h1>
                            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                                Ask questions, share solution ideas, and browse the most useful threads without
                                changing any of the existing discussion logic.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <div className="surface-card min-w-[170px] p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    Current Sort
                                </p>
                                <p className="mt-3 text-xl font-bold text-white capitalize">{sort}</p>
                            </div>
                            <div className="surface-card min-w-[170px] p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    Visible Threads
                                </p>
                                <p className="mt-3 text-xl font-bold text-white">{discussions.length}</p>
                            </div>
                        </div>
                    </div>

                    {user && (
                        <div className="mt-6">
                            <button onClick={handleCreateClick} className="primary-button">
                                <Plus className="h-4 w-4" />
                                {showForm ? 'Close composer' : 'Start a topic'}
                            </button>
                        </div>
                    )}
                </section>

                {showForm && user && (
                    <section className="glass-panel section-fade p-6 md:p-8">
                        <div className="mb-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                New Discussion
                            </p>
                            <h2 className="mt-2 text-2xl font-bold text-white">Start a new thread</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                Keep the title clear, mention the problem, and share enough context for others to help.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <label className="block">
                                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Problem
                                </span>
                                <select
                                    required
                                    value={formData.problemId}
                                    onChange={(e) => setFormData({ ...formData, problemId: e.target.value })}
                                    className="soft-input"
                                >
                                    <option value="" disabled>
                                        Choose a problem
                                    </option>
                                    {problems.map((problem) => (
                                        <option key={problem.id} value={problem.id}>
                                            {problem.title}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Title
                                </span>
                                <input
                                    required
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="soft-input"
                                    placeholder="O(n) approach with explanation"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Content
                                </span>
                                <textarea
                                    required
                                    rows={6}
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="soft-input font-mono"
                                    placeholder="Explain your approach or ask your question here."
                                />
                            </label>

                            <div className="flex flex-wrap justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="secondary-button"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="primary-button disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {submitting ? 'Posting...' : 'Post discussion'}
                                </button>
                            </div>
                        </form>
                    </section>
                )}

                <section className="glass-panel section-fade p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        {sortOptions.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => fetchDiscussions(1, option.id)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                                    sort === option.id
                                        ? 'bg-sky-400/15 text-white shadow-[inset_0_0_0_1px_rgba(125,211,252,0.28)]'
                                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </section>

                <section className="space-y-4">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="surface-card animate-pulse p-5">
                                <div className="flex gap-4">
                                    <div className="h-20 w-16 rounded-2xl bg-dark-700" />
                                    <div className="flex-1 space-y-3">
                                        <div className="h-5 w-2/3 rounded-full bg-dark-700" />
                                        <div className="h-4 w-1/3 rounded-full bg-dark-700" />
                                        <div className="h-4 w-full rounded-full bg-dark-800" />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : discussions.length === 0 ? (
                        <div className="glass-panel section-fade px-6 py-16 text-center">
                            <div className="metric-icon mx-auto h-14 w-14 bg-white/5">
                                <MessageSquare className="h-6 w-6 text-slate-400" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-white">No discussions yet</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                When threads are created, they will show up here with vote counts and problem context.
                            </p>
                        </div>
                    ) : (
                        discussions.map((discussion) => {
                            const preview = discussion.contentPreview || discussion.content || '';

                            return (
                                <article key={discussion.id} className="surface-card card-hover section-fade p-5 md:p-6">
                                    <div className="flex flex-col gap-5 md:flex-row">
                                        <div className="flex shrink-0 flex-row items-center gap-3 md:flex-col md:items-center">
                                            <button
                                                onClick={() => handleUpvote(discussion.id, discussion.problemId)}
                                                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400 transition-colors hover:text-sky-300"
                                            >
                                                <ThumbsUp className="h-4 w-4" />
                                            </button>
                                            <div className="text-center">
                                                <p className="font-mono text-lg font-semibold text-white">
                                                    {discussion.upvotes}
                                                </p>
                                                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                                                    Votes
                                                </p>
                                            </div>
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <h3 className="text-xl font-bold text-white">{discussion.title}</h3>
                                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                    {discussion.commentCount} comments
                                                </span>
                                            </div>

                                            <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-400">
                                                {preview}
                                                {preview && !preview.endsWith('...') ? '...' : ''}
                                            </p>

                                            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                <span className="inline-flex items-center gap-2">
                                                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] text-slate-200">
                                                        {discussion.author.charAt(0)}
                                                    </span>
                                                    {discussion.author}
                                                </span>

                                                {discussion.problem?.slug ? (
                                                    <Link
                                                        to={`/problems/${discussion.problem.slug}`}
                                                        className="inline-flex items-center gap-2 text-sky-300 transition-colors hover:text-sky-200"
                                                    >
                                                        <Code2 className="h-3.5 w-3.5" />
                                                        {discussion.problem.title}
                                                    </Link>
                                                ) : (
                                                    <span className="inline-flex items-center gap-2 text-slate-400">
                                                        <Code2 className="h-3.5 w-3.5" />
                                                        Problem unavailable
                                                    </span>
                                                )}

                                                <span className="inline-flex items-center gap-2">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {new Date(discussion.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            );
                        })
                    )}
                </section>

                {!loading && totalPages > 1 && (
                    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                        <span className="text-sm text-slate-400">
                            Page {page} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => fetchDiscussions(page - 1, sort)}
                                className="secondary-button px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                disabled={page === totalPages}
                                onClick={() => fetchDiscussions(page + 1, sort)}
                                className="secondary-button px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
