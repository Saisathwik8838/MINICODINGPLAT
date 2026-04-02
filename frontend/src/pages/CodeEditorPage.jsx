import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Play, Send, CheckCircle, AlertTriangle, Clock, Database, ChevronDown, X, History, Loader2, Code2 } from 'lucide-react';
import api from '../api/axios.js';

const BOILERPLATE = {
    PYTHON: `import sys\ninput_data = sys.stdin.read().split()\n# Parse your input from input_data\n# Write your solution here\n# Print your output\n`,
    JAVASCRIPT: `const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\n// Parse your input from lines\n// Write your solution here\n// console.log(result);\n`,
    CPP: `#include <iostream>\n#include <vector>\nusing namespace std;\nint main() {\n    // Read input from stdin\n    // Write your solution here\n    return 0;\n}\n`,
    JAVA: `import java.util.Scanner;\nclass Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Read input from stdin\n        // Write your solution here\n    }\n}\n`
};

export default function CodeEditorPage() {
    const { slug } = useParams();
    const [problem, setProblem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [language, setLanguage] = useState('PYTHON');
    const [code, setCode] = useState('');
    const [activeTab, setActiveTab] = useState('testcases'); // 'testcases', 'result', 'history'
    
    // Execution State
    const [output, setOutput] = useState(null);
    const [isExecuting, setIsExecuting] = useState(false);
    
    // History State
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [selectedPastCode, setSelectedPastCode] = useState(null);

    const autosaveTimer = useRef(null);

    useEffect(() => {
        const fetchProblem = async () => {
            try {
                const { data } = await api.get(`/problems/${slug}`);
                const p = data.data.problem;
                setProblem(p);
                
                // Load draft or boilerplate
                const draft = localStorage.getItem(`draft_${p.id}_PYTHON`);
                setCode(draft || BOILERPLATE['PYTHON']);
            } catch (err) {
                setError(err.response?.status === 404 ? 'Problem not found' : 'Error loading problem');
            } finally {
                setLoading(false);
            }
        };
        fetchProblem();
    }, [slug]);

    // Autosave Draft
    useEffect(() => {
        if (!problem || !code) return;
        
        // Prevent saving boilerplate as draft if they just switched
        if (Object.values(BOILERPLATE).includes(code)) return;

        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
        autosaveTimer.current = setTimeout(() => {
            localStorage.setItem(`draft_${problem.id}_${language}`, code);
        }, 1000);

        return () => clearTimeout(autosaveTimer.current);
    }, [code, language, problem]);

    const handleLanguageChange = (e) => {
        const lang = e.target.value;
        setLanguage(lang);
        if (problem) {
            const draft = localStorage.getItem(`draft_${problem.id}_${lang}`);
            setCode(draft || BOILERPLATE[lang]);
        }
    };

    const pollSubmission = async (id, attempt = 1) => {
        if (attempt > 15) {
            setOutput({ status: 'TIMEOUT', detail: 'Execution took too long.' });
            setIsExecuting(false);
            return;
        }
        
        try {
            const { data } = await api.get(`/submissions/${id}`);
            const sub = data.data.submission;
            
            if (sub.status === 'PENDING' || sub.status === 'PROCESSING') {
                setTimeout(() => pollSubmission(id, attempt + 1), 1500);
            } else {
                setOutput(sub);
                setIsExecuting(false);
            }
        } catch (err) {
            setOutput({ status: 'INTERNAL_ERROR', detail: 'Failed to fetch result.' });
            setIsExecuting(false);
        }
    };

    const handleExecute = async (isRun) => {
        setIsExecuting(true);
        setActiveTab('result');
        setOutput(null);

        try {
            const { data } = await api.post('/submissions', {
                code,
                language,
                problemId: problem.id,
                isRun
            });
            pollSubmission(data.data.submissionId);
        } catch (err) {
            setOutput({ 
                status: 'INTERNAL_ERROR', 
                detail: err.response?.data?.message || 'Failed to submit code.' 
            });
            setIsExecuting(false);
        }
    };

    const handleTabSwitch = async (tab) => {
        setActiveTab(tab);
        if (tab === 'history' && problem) {
            setLoadingHistory(true);
            try {
                const { data } = await api.get(`/submissions?problemId=${problem.id}&limit=20`);
                setHistory(data.data.submissions);
            } catch (err) {
                console.error("Failed to load history");
            } finally {
                setLoadingHistory(false);
            }
        }
    };

    // Render markdown dangerously
    const createMarkup = (text) => {
        if (!text) return { __html: '' };
        // Basic markdown formatting for description safely
        let html = text
            .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br/>');
        return { __html: `<p>${html}</p>` };
    };

    if (loading) {
        return (
            <div className="flex h-full w-full bg-dark-900 gap-2 p-2">
                <div className="w-[40%] glass-panel animate-pulse p-6"><div className="h-8 bg-dark-700 w-1/2 mb-4"></div><div className="h-4 bg-dark-700 w-full mb-2"></div><div className="h-4 bg-dark-700 w-3/4"></div></div>
                <div className="flex-1 glass-panel animate-pulse bg-dark-800"></div>
            </div>
        );
    }

    if (error || !problem) {
        return (
            <div className="flex flex-col items-center justify-center p-12 h-full bg-dark-900 text-center">
                <AlertTriangle className="w-16 h-16 text-gray-600 mb-4 opacity-50" />
                <h2 className="text-2xl font-bold text-white mb-2">{error || 'Problem Not Found'}</h2>
                <Link to="/problems" className="mt-4 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg">Browse Problems</Link>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full bg-dark-900 gap-2 p-2 relative">
            
            {/* Modal for viewing past code */}
            {selectedPastCode && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-dark-900 border border-dark-600 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl">
                        <div className="px-6 py-4 border-b border-dark-700 flex justify-between items-center bg-dark-800 rounded-t-xl">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Code2 className="w-5 h-5 text-primary-400"/> Submission Code</h3>
                            <button onClick={() => setSelectedPastCode(null)} className="text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="flex-1">
                            <Editor
                                height="100%"
                                language={(selectedPastCode.language || 'python').toLowerCase()}
                                theme="vs-dark"
                                value={selectedPastCode.code}
                                options={{ readOnly: true, minimap: { enabled: false } }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* LEFT PANEL: Problem Statement */}
            <div className="w-[40%] flex flex-col gap-2 relative">
                <div className="glass-panel flex-1 flex flex-col overflow-hidden relative">
                    <div className="h-12 border-b border-dark-700/50 flex items-center px-4 bg-dark-800/50 z-10 shrink-0">
                        <h2 className="font-semibold text-gray-200">Description</h2>
                    </div>

                    <div className="p-6 overflow-y-auto code-scroll">
                        <h1 className="text-2xl font-bold mb-2">{problem.title}</h1>
                        <div className="flex items-center gap-3 mb-6">
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${problem.difficulty === 'EASY' ? 'bg-green-500/10 text-green-400 border-green-500/20' : problem.difficulty === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{problem.difficulty}</span>
                            <span className="text-xs text-gray-400 bg-dark-800 px-2 py-1 rounded">Time Limit: {problem.timeLimit}s</span>
                            <span className="text-xs text-gray-400 bg-dark-800 px-2 py-1 rounded">Memory Limit: {problem.memoryLimit}MB</span>
                        </div>

                        <div className="prose prose-invert text-gray-300 text-sm leading-relaxed" dangerouslySetInnerHTML={createMarkup(problem.description)}></div>
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
                                onClick={() => handleExecute(true)}
                                disabled={isExecuting}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-gray-300 text-sm font-medium rounded-md transition-all border border-dark-600/50 hover:border-dark-500 disabled:opacity-50"
                            >
                                {isExecuting ? <Loader2 className="w-4 h-4 animate-spin text-gray-400"/> : <Play className="w-4 h-4" />}
                                Run
                            </button>
                            <button 
                                onClick={() => handleExecute(false)}
                                disabled={isExecuting}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-500 hover:bg-primary-400 text-white text-sm font-medium rounded-md shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all hover:shadow-[0_0_20px_rgba(96,165,250,0.5)] disabled:opacity-50"
                            >
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
                                padding: { top: 16 },
                                scrollBeyondLastLine: false,
                                smoothScrolling: true
                            }}
                        />
                    </div>
                </div>

                {/* Console Section */}
                <div className="glass-panel flex-1 flex flex-col overflow-hidden relative min-h-[200px]">
                    <div className="h-10 bg-dark-800/80 border-b border-dark-700/50 flex items-center px-4 z-10 shrink-0 gap-6">
                        <button onClick={() => handleTabSwitch('testcases')} className={`text-sm font-medium h-full px-1 transition-colors ${activeTab === 'testcases' ? 'text-gray-200 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-300'}`}>Test Cases</button>
                        <button onClick={() => handleTabSwitch('result')} className={`text-sm font-medium h-full px-1 transition-colors ${activeTab === 'result' ? 'text-gray-200 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-300'}`}>Test Result</button>
                        <button onClick={() => handleTabSwitch('history')} className={`text-sm font-medium h-full px-1 transition-colors flex items-center gap-1.5 ${activeTab === 'history' ? 'text-gray-200 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-300'}`}><History className="w-3.5 h-3.5"/> Submissions</button>
                    </div>

                    <div className="p-4 overflow-y-auto code-scroll flex-1">
                        {activeTab === 'testcases' && (
                            <div className="flex flex-col gap-3">
                                {problem.testCases && problem.testCases.filter(tc => !tc.isHidden).map((tc, idx) => (
                                    <div key={tc.id} className="bg-dark-900 border border-dark-700/50 rounded p-3">
                                        <p className="text-xs font-semibold text-gray-400 mb-1">Test Case {idx + 1}</p>
                                        <div className="text-sm font-mono text-gray-300 bg-dark-800 p-2 rounded mb-2">Input: {tc.input}</div>
                                        <div className="text-sm font-mono text-gray-300 bg-dark-800 p-2 rounded">Expected: {tc.expectedOutput}</div>
                                    </div>
                                ))}
                                {(!problem.testCases || problem.testCases.filter(tc => !tc.isHidden).length === 0) && <p className="text-gray-500 text-sm">No visible testcases available.</p>}
                            </div>
                        )}

                        {activeTab === 'result' && (
                            output ? (
                                <div className="space-y-4 animate-in fade-in">
                                    <div className="flex items-center justify-between">
                                        <h3 className={`text-xl font-bold flex items-center gap-2 ${['ACCEPTED', 'success'].includes(output.status) ? 'text-green-400' : 'text-red-400'}`}>
                                            {['ACCEPTED', 'success'].includes(output.status) ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                                            {output.status.replace(/_/g, ' ')}
                                        </h3>
                                        {output.testcasesPassed !== undefined && (
                                            <span className="text-sm font-medium text-gray-400">
                                                Passed: <strong className="text-white">{output.testcasesPassed} / {output.totalTestcases}</strong>
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-4 mb-4">
                                        <div className="flex items-center gap-1.5 text-sm text-gray-400 bg-dark-900/50 px-3 py-1.5 rounded-md border border-dark-700">
                                            <Clock className="w-4 h-4 text-amber-400" /> Runtime: <span className="text-gray-200 font-mono font-medium">{output.runtime ? `${output.runtime}ms` : '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm text-gray-400 bg-dark-900/50 px-3 py-1.5 rounded-md border border-dark-700">
                                            <Database className="w-4 h-4 text-emerald-400" /> Memory: <span className="text-gray-200 font-mono font-medium">{output.memory ? `${output.memory}MB` : '-'}</span>
                                        </div>
                                    </div>
                                    {(output.detail || output.errorMessage || output.stdout || output.error) && (
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Details / Output</p>
                                            <pre className="bg-dark-900 p-3 rounded border border-dark-700/50 text-gray-300 font-mono text-sm shadow-inner whitespace-pre-wrap">
                                                {output.detail || output.errorMessage || output.error || output.stdout || "No output generated."}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            ) : isExecuting ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                                    <p className="text-sm font-medium">Executing code in sandbox...</p>
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm">Run your code to see the results here.</p>
                            )
                        )}

                        {activeTab === 'history' && (
                            loadingHistory ? <div className="text-center mt-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-500"/></div> :
                            history.length === 0 ? <p className="text-gray-500 text-sm">No submissions found for this problem.</p> :
                            <table className="w-full text-left text-sm text-gray-300">
                                <thead className="bg-dark-800 text-xs text-gray-500 border-b border-dark-700">
                                    <tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Lang</th><th className="px-4 py-2">Runtime</th></tr>
                                </thead>
                                <tbody>
                                    {history.map(s => (
                                        <tr key={s.id} onClick={() => setSelectedPastCode(s)} className="border-b border-dark-800 hover:bg-dark-800/50 cursor-pointer transition-colors group">
                                            <td className="px-4 py-3 text-gray-400 text-xs">{new Date(s.createdAt).toLocaleString()}</td>
                                            <td className="px-4 py-3 font-semibold text-xs group-hover:text-white transition-colors">
                                                <span className={s.status === 'ACCEPTED' ? 'text-green-500' : 'text-red-400'}>{s.status.replace(/_/g, ' ')}</span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs">{s.language}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-amber-400">{s.runtime ? `${s.runtime}ms` : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
