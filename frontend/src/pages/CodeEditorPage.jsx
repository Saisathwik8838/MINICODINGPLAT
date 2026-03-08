import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Send, Settings, CheckCircle, XCircle, Clock, Database, ChevronDown } from 'lucide-react';

const BOILERPLATE = {
    PYTHON: `def solve(nums, target):\n    # Write your code here\n    pass\n`,
    JAVASCRIPT: `function solve(nums, target) {\n    // Write your code here\n}\n`,
    CPP: `#include <iostream>\n#include <vector>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> solve(vector<int>& nums, int target) {\n        // Write your code here\n    }\n};\n`,
    JAVA: `class Main {\n    public static void main(String[] args) {\n        // Setup testcase here\n    }\n\n    public int[] solve(int[] nums, int target) {\n        // Write your code here\n        return new int[]{};\n    }\n}\n`
};

export default function CodeEditorPage() {
    const [language, setLanguage] = useState('PYTHON');
    const [code, setCode] = useState(BOILERPLATE['PYTHON']);
    const [output, setOutput] = useState(null);
    const [isRunning, setIsRunning] = useState(false);

    const handleLanguageChange = (e) => {
        const lang = e.target.value;
        setLanguage(lang);
        setCode(BOILERPLATE[lang]);
    };

    const handleRunCode = () => {
        setIsRunning(true);
        // Simulate network delay
        setTimeout(() => {
            setOutput({
                status: 'Accepted',
                runtime: '45ms',
                memory: '12.4 MB',
                stdout: '[0, 1]\n',
            });
            setIsRunning(false);
        }, 1500);
    };

    return (
        <div className="flex h-full w-full bg-dark-900 gap-2 p-2 relative">

            {/* LEFT PANEL: Problem Statement */}
            <div className="w-[40%] flex flex-col gap-2 relative">
                <div className="glass-panel flex-1 flex flex-col overflow-hidden relative">

                    <div className="h-12 border-b border-dark-700/50 flex items-center px-4 bg-dark-800/50 z-10 shrink-0">
                        <h2 className="font-semibold text-gray-200">Description</h2>
                    </div>

                    <div className="p-6 overflow-y-auto code-scroll">
                        <h1 className="text-2xl font-bold mb-2">1. Two Sum</h1>
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-2.5 py-1 bg-green-500/10 text-green-400 text-xs font-medium rounded-full border border-green-500/20">Easy</span>
                        </div>

                        <div className="prose prose-invert text-gray-300 text-sm leading-relaxed">
                            <p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>.</p>
                            <p>You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.</p>

                            <div className="mt-8 space-y-4">
                                <div className="bg-dark-900/50 p-4 rounded-lg border border-dark-700/50">
                                    <p className="font-semibold text-white mb-2 text-xs uppercase tracking-wider">Example 1</p>
                                    <p><strong>Input:</strong> nums = [2,7,11,15], target = 9</p>
                                    <p><strong>Output:</strong> [0,1]</p>
                                    <p><strong>Explanation:</strong> Because nums[0] + nums[1] == 9, we return [0, 1].</p>
                                </div>
                            </div>

                            <div className="mt-8">
                                <h3 className="font-semibold text-white mb-2 text-xs uppercase tracking-wider">Constraints</h3>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><code>2 &lt;= nums.length &lt;= 10<sup>4</sup></code></li>
                                    <li><code>-10<sup>9</sup> &lt;= nums[i] &lt;= 10<sup>9</sup></code></li>
                                    <li><code>-10<sup>9</sup> &lt;= target &lt;= 10<sup>9</sup></code></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: Editor & Console Container */}
            <div className="flex-1 flex flex-col gap-2 overflow-hidden relative">

                {/* Monaco Editor Section */}
                <div className="glass-panel flex-[2] flex flex-col overflow-hidden relative">

                    <div className="h-[46px] bg-dark-800/80 border-b border-dark-700/50 flex items-center justify-between px-4 z-10 shrink-0">
                        <div className="relative group cursor-pointer inline-flex items-center gap-2 bg-dark-700/50 hover:bg-dark-600/50 transition-colors px-3 py-1.5 rounded-md border border-dark-600/50">
                            <select
                                title="language"
                                className="appearance-none bg-transparent text-sm font-medium text-gray-200 outline-none pr-6 cursor-pointer"
                                value={language}
                                onChange={handleLanguageChange}
                            >
                                <option value="PYTHON">Python 3.10</option>
                                <option value="JAVASCRIPT">Node.js</option>
                                <option value="CPP">C++ (GCC 12)</option>
                                <option value="JAVA">Java 17</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 pointer-events-none" />
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRunCode}
                                disabled={isRunning}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-gray-300 text-sm font-medium rounded-md transition-all border border-dark-600/50 hover:border-dark-500 focus:ring-2 focus:ring-dark-500 disabled:opacity-50"
                            >
                                {isRunning ? (
                                    <div className="w-4 h-4 rounded-full border-2 border-gray-400 border-t-white animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4" />
                                )}
                                Run
                            </button>
                            <button className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-500 hover:bg-primary-400 text-white text-sm font-medium rounded-md shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all hover:shadow-[0_0_20px_rgba(96,165,250,0.5)]">
                                <Send className="w-4 h-4" />
                                Submit
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 pt-2 w-full">
                        <Editor
                            height="100%"
                            language={language.toLowerCase()}
                            theme="vs-dark"
                            value={code}
                            onChange={(val) => setCode(val)}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: "JetBrains Mono, Menlo, Monaco, Consolas, monospace",
                                lineHeight: 24,
                                padding: { top: 16 },
                                scrollBeyondLastLine: false,
                                smoothScrolling: true,
                                cursorBlinking: "smooth",
                                cursorSmoothCaretAnimation: "on",
                                formatOnPaste: true,
                                scrollbar: {
                                    verticalScrollbarSize: 8,
                                    horizontalScrollbarSize: 8,
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Console / Output Section */}
                <div className="glass-panel flex-1 flex flex-col overflow-hidden relative min-h-[200px]">
                    <div className="h-10 bg-dark-800/80 border-b border-dark-700/50 flex items-center px-4 z-10 shrink-0 gap-6">
                        <button className="text-sm font-medium text-gray-200 border-b-2 border-primary-500 h-full px-1">Test Cases</button>
                        <button className="text-sm font-medium text-gray-500 hover:text-gray-300 h-full px-1 transition-colors">Test Result</button>
                    </div>

                    <div className="p-4 overflow-y-auto code-scroll flex-1">
                        {output ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-bold text-success flex items-center gap-2">
                                        <CheckCircle className="w-6 h-6" />
                                        {output.status}
                                    </h3>
                                </div>

                                <div className="flex gap-4 mb-4">
                                    <div className="flex items-center gap-1.5 text-sm text-gray-400 bg-dark-900/50 px-3 py-1.5 rounded-md border border-dark-700 relative overflow-hidden group">
                                        <Clock className="w-4 h-4 text-amber-400" />
                                        Runtime: <span className="text-gray-200 font-mono font-medium">{output.runtime}</span>
                                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-dark-600">
                                            <div className="h-full bg-amber-400 w-[15%]" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm text-gray-400 bg-dark-900/50 px-3 py-1.5 rounded-md border border-dark-700 relative overflow-hidden">
                                        <Database className="w-4 h-4 text-emerald-400" />
                                        Memory: <span className="text-gray-200 font-mono font-medium">{output.memory}</span>
                                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-dark-600">
                                            <div className="h-full bg-emerald-400 w-[25%]" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Stdout</p>
                                    <pre className="bg-dark-900 p-3 rounded border border-dark-700/50 text-gray-300 font-mono text-sm shadow-inner">
                                        {output.stdout || "No standard output."}
                                    </pre>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <div className="flex gap-2">
                                    <button className="px-3 py-1.5 bg-dark-700 text-white rounded-md text-sm font-medium shadow-sm hover:bg-dark-600 transition-colors">Case 1</button>
                                    <button className="px-3 py-1.5 hover:bg-dark-700/50 text-gray-400 rounded-md text-sm font-medium transition-colors">Case 2</button>
                                    <button className="px-3 py-1.5 hover:bg-dark-700/50 text-gray-400 rounded-md text-sm font-medium transition-colors">Case 3</button>
                                </div>
                                <div className="mt-2 space-y-4">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 mb-1.5">nums =</p>
                                        <div className="bg-dark-900/80 border border-dark-700/50 p-2.5 rounded-md font-mono text-sm text-gray-300 shadow-inner">[2, 7, 11, 15]</div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 mb-1.5">target =</p>
                                        <div className="bg-dark-900/80 border border-dark-700/50 p-2.5 rounded-md font-mono text-sm text-gray-300 shadow-inner">9</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
