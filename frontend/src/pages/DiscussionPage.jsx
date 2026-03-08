import React, { useState } from 'react';
import { MessageSquare, ThumbsUp, ChevronDown, User, Clock, CheckCircle } from 'lucide-react';

export default function DiscussionPage() {
    const mockDiscussions = [
        {
            id: 1,
            title: "O(n) Time and O(n) Space Solution in Python with Explanation",
            author: "saisa",
            isAuthorAdmin: true,
            upvotes: 45,
            commentCount: 12,
            timeAgo: "2 hours ago",
            content: "Here is my approach using a single-pass hash map...",
            tags: ["Python3", "Hash Table"]
        },
        {
            id: 2,
            title: "Why does my C++ solution TLE here?",
            author: "coder_noob",
            isAuthorAdmin: false,
            upvotes: 8,
            commentCount: 3,
            timeAgo: "5 hours ago",
            content: "I wrote this nested loop but it times out on case 55. Any ideas?",
            tags: ["C++", "Help Request"]
        },
        {
            id: 3,
            title: "Optimal JS Map Approach (99% Runtime)",
            author: "js_wizard",
            isAuthorAdmin: false,
            upvotes: 112,
            commentCount: 24,
            timeAgo: "1 day ago",
            content: "Using the Map object instead of an absolute object speeds it up...",
            tags: ["JavaScript", "Algorithm"]
        }
    ];

    return (
        <div className="flex h-full w-full bg-dark-900 overflow-hidden relative">
            <div className="flex-1 overflow-y-auto px-6 py-6 md:px-12 max-w-5xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <MessageSquare className="w-8 h-8 text-primary-500" />
                            Two Sum Discussions
                        </h1>
                        <p className="text-gray-400">Share your solutions, ask for help, or read top approaches.</p>
                    </div>
                    <button className="px-5 py-2.5 bg-primary-500 hover:bg-primary-400 text-white font-medium rounded-lg transition-colors shadow-lg shadow-primary-500/20">
                        New Topic
                    </button>
                </div>

                {/* Filters/Sorting */}
                <div className="flex items-center gap-4 mb-6 border-b border-dark-700 pb-4">
                    <div className="flex gap-2">
                        <button className="px-4 py-1.5 text-sm font-medium rounded-full bg-dark-700 text-white border border-dark-600">Top</button>
                        <button className="px-4 py-1.5 text-sm font-medium rounded-full text-gray-400 hover:bg-dark-800 transition-colors">Recent</button>
                        <button className="px-4 py-1.5 text-sm font-medium rounded-full text-gray-400 hover:bg-dark-800 transition-colors">Unanswered</button>
                    </div>
                </div>

                {/* Discussion List */}
                <div className="space-y-4">
                    {mockDiscussions.map((d) => (
                        <div key={d.id} className="glass-panel p-5 transition-transform hover:-translate-y-0.5 group cursor-pointer border border-dark-700/50 hover:border-dark-600">
                            <div className="flex gap-5">
                                {/* Vote Counter */}
                                <div className="flex flex-col items-center gap-1 shrink-0 bg-dark-800/80 px-3 py-2 rounded-lg border border-dark-700/50 h-fit">
                                    <button className="text-gray-500 hover:text-primary-400 transition-colors">
                                        <ThumbsUp className="w-4 h-4" />
                                    </button>
                                    <span className="font-semibold text-gray-300">{d.upvotes}</span>
                                </div>

                                {/* Content block */}
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-200 group-hover:text-primary-400 transition-colors mb-2">
                                        {d.title}
                                    </h3>

                                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500 mb-3">
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white ${d.isAuthorAdmin ? 'bg-primary-600' : 'bg-dark-600'}`}>
                                                {d.author.charAt(0).toUpperCase()}
                                            </div>
                                            <span className={`${d.isAuthorAdmin ? 'text-primary-400' : 'text-gray-300'}`}>{d.author}</span>
                                        </div>
                                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{d.timeAgo}</span>
                                        <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{d.commentCount} comments</span>
                                    </div>

                                    <div className="flex gap-2">
                                        {d.tags.map(tag => (
                                            <span key={tag} className="px-2 py-1 bg-dark-700/50 text-gray-400 text-xs rounded-md border border-dark-600/50">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}
