import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Code2, AlertCircle } from 'lucide-react';
import api from '../api/axios.js';

export default function ProblemsListPage() {
    const [problems, setProblems] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters & Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [difficulty, setDifficulty] = useState('All');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchProblems = async (pageNum, diff, query) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: pageNum,
                limit: 15
            });
            if (diff !== 'All') params.append('difficulty', diff);
            if (query) params.append('search', query);

            const { data } = await api.get(`/problems?${params.toString()}`);
            setProblems(data.data.problems || []);
            setTotal(data.data.pagination.total);
            setTotalPages(data.data.pagination.totalPages);
            setPage(pageNum);
        } catch (err) {
            setError('Failed to load problems');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProblems(1, difficulty, debouncedSearch);
    }, [difficulty, debouncedSearch]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            fetchProblems(newPage, difficulty, debouncedSearch);
        }
    };

    return (
        <div className="page-shell code-scroll">
            <div className="ambient-orb ambient-orb-cyan right-[8%] top-[40px] h-72 w-72" />
            <div className="ambient-orb ambient-orb-amber left-[-40px] top-[260px] h-72 w-72" />

            <div className="page-width space-y-6">
                <section className="hero-panel section-fade">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <span className="kicker mb-4">Problem Library</span>
                            <h1 className="mb-3 flex items-center gap-3 text-3xl font-bold text-white md:text-4xl">
                                <Code2 className="h-8 w-8 text-sky-300" />
                                Find a challenge worth solving.
                            </h1>
                            <p className="text-base leading-7 text-slate-300">
                                Browse {total} algorithmic challenges, filter by difficulty, and jump into the editor
                                with a cleaner, faster workflow.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="surface-card min-w-[170px] p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                    Active Filter
                                </p>
                                <p className="mt-3 text-2xl font-bold text-white">{difficulty}</p>
                            </div>
                            <div className="surface-card min-w-[170px] p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                    Visible Problems
                                </p>
                                <p className="mt-3 text-2xl font-bold text-white">{problems.length}</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="glass-panel section-fade p-4 md:p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex w-full items-center gap-2 overflow-x-auto code-scroll pb-1 md:w-auto md:pb-0">
                        {['All', 'Easy', 'Medium', 'Hard'].map(d => (
                            <button
                                key={d}
                                onClick={() => setDifficulty(d)}
                                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                                    difficulty === d 
                                    ? 'bg-sky-400/15 text-white shadow-[inset_0_0_0_1px_rgba(125,211,252,0.28)]' 
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>

                        <div className="relative w-full shrink-0 md:w-72">
                            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <input 
                                type="text" 
                                placeholder="Search problems..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="soft-input pl-11"
                            />
                        </div>
                    </div>
                </section>

                <div className="table-shell section-fade">
                    <table className="w-full text-left border-collapse">
                        <thead className="border-b border-white/10 bg-white/[0.03] text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                            <tr>
                                <th className="p-4 w-16 text-center">#</th>
                                <th className="p-4">Title</th>
                                <th className="p-4 w-32">Difficulty</th>
                                <th className="p-4 w-36 text-right pr-6">Acceptance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-700/50">
                            {loading ? (
                                Array.from({ length: 15 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="p-4"><div className="mx-auto h-4 w-4 rounded bg-dark-700"></div></td>
                                        <td className="p-4"><div className="h-5 w-64 rounded bg-dark-700"></div></td>
                                        <td className="p-4"><div className="h-5 w-16 rounded bg-dark-700"></div></td>
                                        <td className="p-4"><div className="ml-auto mr-2 h-4 w-12 rounded bg-dark-700"></div></td>
                                    </tr>
                                ))
                            ) : error ? (
                                <tr>
                                    <td colSpan="4" className="p-12 text-center text-red-400">
                                        <AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
                                        {error}
                                    </td>
                                </tr>
                            ) : problems.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-16 text-center text-gray-500">
                                        <Code2 className="mx-auto mb-4 h-12 w-12 text-dark-600" />
                                        <p className="text-sm font-medium">No problems found matching your criteria.</p>
                                        <button onClick={() => { setDifficulty('All'); setSearch(''); }} className="mt-4 text-sm text-primary-400 transition-colors hover:text-primary-300">Clear Filters</button>
                                    </td>
                                </tr>
                            ) : (
                                problems.map((p, index) => {
                                    const serial = (page - 1) * 15 + index + 1;
                                    return (
                                        <tr key={p.id} className="group transition-colors hover:bg-white/[0.03]">
                                            <td className="p-4 text-center font-mono text-slate-500">{serial}</td>
                                            <td className="p-4">
                                                <Link to={`/problems/${p.slug}`} className="block">
                                                    <span className="font-semibold text-slate-100 transition-colors group-hover:text-sky-300">
                                                        {p.title}
                                                    </span>
                                                    <span className="mt-1 block text-xs text-slate-500">
                                                        Open the editor and run examples instantly.
                                                    </span>
                                                </Link>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide rounded-full border ${p.difficulty === 'EASY' ? 'bg-green-500/10 text-green-400 border-green-500/20' : p.difficulty === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                    {p.difficulty}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right pr-6 font-mono text-sm text-slate-400">
                                                {p.acceptanceRate}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {!loading && totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.03] p-4">
                            <span className="text-sm text-slate-400">Showing page {page} of {totalPages}</span>
                            <div className="flex gap-2">
                                <button 
                                    disabled={page === 1}
                                    onClick={() => handlePageChange(page - 1)}
                                    className="secondary-button px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button 
                                    disabled={page === totalPages}
                                    onClick={() => handlePageChange(page + 1)}
                                    className="secondary-button px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
