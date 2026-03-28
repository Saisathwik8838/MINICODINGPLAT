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
        <div className="flex-1 overflow-y-auto bg-dark-900 code-scroll p-6 md:p-12 relative">
            <div className="max-w-5xl mx-auto space-y-6 relative z-10">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white mb-2 flex items-center gap-3">
                            <Code2 className="w-8 h-8 text-primary-500" />
                            Problems
                        </h1>
                        <p className="text-gray-400">Browse {total} algorithmic challenges to sharpen your skills</p>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 justify-between items-center transition-all bg-dark-800/80">
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto code-scroll pb-1 md:pb-0">
                        {['All', 'Easy', 'Medium', 'Hard'].map(d => (
                            <button
                                key={d}
                                onClick={() => setDifficulty(d)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                                    difficulty === d 
                                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
                                    : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600'
                                }`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full md:w-64 shrink-0">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                            type="text" 
                            placeholder="Search problems..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-dark-900 border border-dark-600 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                        />
                    </div>
                </div>

                {/* Problems List */}
                <div className="glass-panel overflow-hidden border border-dark-700/50 shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-dark-800/80 text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-dark-700">
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
                                        <td className="p-4"><div className="h-4 w-4 bg-dark-700 rounded mx-auto"></div></td>
                                        <td className="p-4"><div className="h-5 w-64 bg-dark-700 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-16 bg-dark-700 rounded"></div></td>
                                        <td className="p-4"><div className="h-4 w-12 bg-dark-700 rounded ml-auto mr-2"></div></td>
                                    </tr>
                                ))
                            ) : error ? (
                                <tr>
                                    <td colSpan="4" className="p-12 text-center text-red-400">
                                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        {error}
                                    </td>
                                </tr>
                            ) : problems.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-16 text-center text-gray-500">
                                        <Code2 className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                                        <p className="text-sm font-medium">No problems found matching your criteria.</p>
                                        <button onClick={() => { setDifficulty('All'); setSearch(''); }} className="mt-4 text-primary-400 hover:text-primary-300 text-sm transition-colors">Clear Filters</button>
                                    </td>
                                </tr>
                            ) : (
                                problems.map((p, index) => {
                                    const serial = (page - 1) * 15 + index + 1;
                                    return (
                                        <tr key={p.id} className="hover:bg-dark-800/30 transition-colors group">
                                            <td className="p-4 text-center font-mono text-gray-500">{serial}</td>
                                            <td className="p-4">
                                                <Link to={`/problems/${p.slug}`} className="font-semibold text-gray-200 group-hover:text-primary-400 transition-colors">
                                                    {p.title}
                                                </Link>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide rounded-full border ${p.difficulty === 'EASY' ? 'bg-green-500/10 text-green-400 border-green-500/20' : p.difficulty === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                    {p.difficulty}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right pr-6 font-mono text-sm text-gray-400">
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
                        <div className="bg-dark-800/50 border-t border-dark-700/50 p-4 flex items-center justify-between">
                            <span className="text-sm text-gray-400">Showing page {page} of {totalPages}</span>
                            <div className="flex gap-2">
                                <button 
                                    disabled={page === 1}
                                    onClick={() => handlePageChange(page - 1)}
                                    className="px-3 py-1.5 rounded-md bg-dark-700 hover:bg-dark-600 text-gray-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button 
                                    disabled={page === totalPages}
                                    onClick={() => handlePageChange(page + 1)}
                                    className="px-3 py-1.5 rounded-md bg-dark-700 hover:bg-dark-600 text-gray-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
