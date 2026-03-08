import React, { useState } from 'react';
import { Shield, Users, Code2, Database, Plus, Trash2, Edit } from 'lucide-react';

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState('PROBLEMS');

    return (
        <div className="flex flex-col h-full w-full bg-dark-900 overflow-hidden">

            {/* Admin Header */}
            <div className="h-16 border-b border-dark-700/50 bg-dark-800/80 px-8 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                        <Shield className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
                        <p className="text-xs text-gray-400">Manage platform resources safely</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Admin Sidebar */}
                <div className="w-64 border-r border-dark-700/50 bg-dark-800/50 p-4 flex flex-col gap-2 shrink-0">
                    <button
                        onClick={() => setActiveTab('PROBLEMS')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'PROBLEMS' ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' : 'text-gray-400 hover:bg-dark-700/50 hover:text-white'}`}
                    >
                        <Code2 className="w-5 h-5" />
                        Problems
                    </button>

                    <button
                        onClick={() => setActiveTab('USERS')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'USERS' ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' : 'text-gray-400 hover:bg-dark-700/50 hover:text-white'}`}
                    >
                        <Users className="w-5 h-5" />
                        Users
                    </button>
                </div>

                {/* Admin Content Area */}
                <div className="flex-1 p-8 overflow-y-auto">
                    {activeTab === 'PROBLEMS' ? <AdminProblems /> : <AdminUsers />}
                </div>
            </div>
        </div>
    );
}

function AdminProblems() {
    return (
        <div className="animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">Manage Problems</h2>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-400 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary-500/20">
                    <Plus className="w-4 h-4" />
                    New Problem
                </button>
            </div>

            <div className="glass-panel overflow-hidden border border-dark-700/50">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-dark-800/50 text-xs uppercase tracking-wider text-gray-400 border-b border-dark-700/50">
                            <th className="p-4 font-medium">ID</th>
                            <th className="p-4 font-medium">Title</th>
                            <th className="p-4 font-medium">Difficulty</th>
                            <th className="p-4 font-medium">Time Limit</th>
                            <th className="p-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700/50">
                        {/* Mock Row */}
                        <tr className="hover:bg-dark-800/30 transition-colors group">
                            <td className="p-4 font-mono text-xs text-gray-500">clk29xj12...</td>
                            <td className="p-4 font-medium text-gray-200">Two Sum</td>
                            <td className="p-4">
                                <span className="px-2.5 py-1 bg-green-500/10 text-green-400 text-xs font-medium rounded-full border border-green-500/20">Easy</span>
                            </td>
                            <td className="p-4 text-sm text-gray-400">5.0s</td>
                            <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2 hover:bg-dark-700 rounded-md text-gray-400 hover:text-primary-400 transition-colors">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button className="p-2 hover:bg-red-500/10 rounded-md text-gray-400 hover:text-red-400 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function AdminUsers() {
    return (
        <div className="animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">Manage Users</h2>
            </div>

            <div className="glass-panel overflow-hidden border border-dark-700/50">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-dark-800/50 text-xs uppercase tracking-wider text-gray-400 border-b border-dark-700/50">
                            <th className="p-4 font-medium">User</th>
                            <th className="p-4 font-medium">Email</th>
                            <th className="p-4 font-medium">Role</th>
                            <th className="p-4 font-medium text-center">Solved</th>
                            <th className="p-4 font-medium text-right">Score</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700/50">
                        {/* Mock Row */}
                        <tr className="hover:bg-dark-800/30 transition-colors">
                            <td className="p-4 font-medium text-gray-200">saisa</td>
                            <td className="p-4 text-sm text-gray-400">saisa@example.com</td>
                            <td className="p-4">
                                <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 text-xs font-medium rounded-full border border-purple-500/20">ADMIN</span>
                            </td>
                            <td className="p-4 text-center font-mono text-sm text-gray-300">12</td>
                            <td className="p-4 text-right font-mono text-sm text-primary-400">120</td>
                        </tr>
                        <tr className="hover:bg-dark-800/30 transition-colors">
                            <td className="p-4 font-medium text-gray-200">coder123</td>
                            <td className="p-4 text-sm text-gray-400">user@example.com</td>
                            <td className="p-4">
                                <span className="px-2.5 py-1 bg-gray-500/10 text-gray-400 text-xs font-medium rounded-full border border-gray-500/20">USER</span>
                            </td>
                            <td className="p-4 text-center font-mono text-sm text-gray-300">5</td>
                            <td className="p-4 text-right font-mono text-sm text-primary-400">50</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
