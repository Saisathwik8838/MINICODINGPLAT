import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    Clock3,
    Code2,
    Database,
    History,
    Loader2,
    Play,
    Send,
    X
} from 'lucide-react';
import api from '../api/axios.js';

const BOILERPLATE = {
    PYTHON: `import sys\ninput_data = sys.stdin.read().split()\n# Parse your input from input_data\n# Write your solution here\n# Print your output\n`,
    JAVASCRIPT: `const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\n// Parse your input from lines\n// Write your solution here\n// console.log(result);\n`,
    CPP: `#include <iostream>\n#include <vector>\nusing namespace std;\nint main() {\n    // Read input from stdin\n    // Write your solution here\n    return 0;\n}\n`,
    JAVA: `import java.util.Scanner;\nclass Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Read input from stdin\n        // Write your solution here\n    }\n}\n`
};

const difficultyToneMap = {
    EASY: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    MEDIUM: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    HARD: 'border-rose-400/20 bg-rose-400/10 text-rose-300'
};

const statusToneMap = {
    ACCEPTED: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    WRONG_ANSWER: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
    TIME_LIMIT_EXCEEDED: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    RUNTIME_ERROR: 'border-orange-400/20 bg-orange-400/10 text-orange-300',
    COMPILATION_ERROR: 'border-slate-500/20 bg-slate-500/10 text-slate-300',
    INTERNAL_ERROR: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
    TIMEOUT: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    PENDING: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
    PROCESSING: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
    success: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
};

const languageLabelMap = {
    PYTHON: 'Python 3.10',
    JAVASCRIPT: 'Node.js',
    CPP: 'C++ (GCC 12)',
    JAVA: 'Java 17'
};

const monacoLanguageMap = {
    PYTHON: 'python',
    JAVASCRIPT: 'javascript',
    CPP: 'cpp',
    JAVA: 'java'
};

const formatStatus = (status = '') => status.replace(/_/g, ' ');
const isSuccessStatus = (status = '') => ['ACCEPTED', 'SUCCESS', 'success'].includes(status);

export default function CodeEditorPage() {
    const { slug } = useParams();
    const [problem, setProblem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [language, setLanguage] = useState('PYTHON');
    const [code, setCode] = useState('');
    const [activeTab, setActiveTab] = useState('testcases');
    const [output, setOutput] = useState(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [selectedPastCode, setSelectedPastCode] = useState(null);

    const autosaveTimer = useRef(null);

    useEffect(() => {
        const fetchProblem = async () => {
            try {
                const { data } = await api.get(`/problems/${slug}`);
                const loadedProblem = data.data.problem;
                setProblem(loadedProblem);

                const draft = localStorage.getItem(`draft_${loadedProblem.id}_PYTHON`);
                setCode(draft || BOILERPLATE.PYTHON);
            } catch (err) {
                setError(err.response?.status === 404 ? 'Problem not found' : 'Error loading problem');
            } finally {
                setLoading(false);
            }
        };

        fetchProblem();
    }, [slug]);

    useEffect(() => {
        if (!problem || !code) return;
        if (Object.values(BOILERPLATE).includes(code)) return;

        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
        autosaveTimer.current = setTimeout(() => {
            localStorage.setItem(`draft_${problem.id}_${language}`, code);
        }, 1000);

        return () => clearTimeout(autosaveTimer.current);
    }, [code, language, problem]);

    const handleLanguageChange = (e) => {
        const nextLanguage = e.target.value;
        setLanguage(nextLanguage);

        if (problem) {
            const draft = localStorage.getItem(`draft_${problem.id}_${nextLanguage}`);
            setCode(draft || BOILERPLATE[nextLanguage]);
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
            const submission = data.data.submission;

            if (submission.status === 'PENDING' || submission.status === 'PROCESSING') {
                setTimeout(() => pollSubmission(id, attempt + 1), 1500);
            } else {
                setOutput(submission);
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
                console.error('Failed to load history');
            } finally {
                setLoadingHistory(false);
            }
        }
    };

    const createMarkup = (text) => {
        if (!text) return { __html: '' };

        const html = text
            .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br/>');

        return { __html: `<p>${html}</p>` };
    };

    if (loading) {
        return <CodeEditorLoading />;
    }

    if (error || !problem) {
        return (
            <div className="page-shell code-scroll">
                <div className="page-width flex min-h-full max-w-3xl items-center justify-center">
                    <div className="glass-panel w-full p-8 text-center md:p-10">
                        <div className="metric-icon mx-auto h-16 w-16 bg-white/5">
                            <AlertTriangle className="h-7 w-7 text-slate-400" />
                        </div>
                        <h2 className="mt-5 text-2xl font-bold text-white">{error || 'Problem not found'}</h2>
                        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
                            The problem could not be loaded right now. You can go back to the library and pick another
                            challenge.
                        </p>
                        <Link to="/problems" className="primary-button mt-6">
                            Browse problems
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const visibleTestCases = (problem.testCases || []).filter((testCase) => !testCase.isHidden);
    const detailText =
        output?.detail || output?.errorMessage || output?.error || output?.stdout || 'No output generated.';

    return (
        <div className="page-shell code-scroll">
            <div className="ambient-orb ambient-orb-cyan right-[4%] top-[30px] h-72 w-72" />
            <div className="ambient-orb ambient-orb-amber left-[-80px] top-[340px] h-80 w-80" />

            {selectedPastCode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
                    <div className="glass-panel h-[82vh] w-full max-w-5xl overflow-hidden">
                        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-6 py-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    Submission Snapshot
                                </p>
                                <h3 className="mt-2 text-lg font-bold text-white">
                                    {languageLabelMap[selectedPastCode.language] || selectedPastCode.language}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedPastCode(null)}
                                className="secondary-button px-3 py-2"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="h-[calc(82vh-81px)] bg-[#0a1020]">
                            <Editor
                                height="100%"
                                language={monacoLanguageMap[selectedPastCode.language] || 'python'}
                                theme="vs-dark"
                                value={selectedPastCode.code}
                                options={{
                                    readOnly: true,
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    scrollBeyondLastLine: false
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="mx-auto max-w-[1600px] space-y-6">
                <section className="hero-panel section-fade">
                    <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-3xl">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="kicker">Problem Workspace</span>
                                <Link to="/problems" className="secondary-button px-3 py-2 text-xs">
                                    Back to library
                                </Link>
                            </div>
                            <h1 className="mt-5 text-3xl font-bold text-white md:text-4xl">{problem.title}</h1>
                            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                                Write, run, and submit from a calmer editor layout while keeping the exact same
                                execution flow and submission logic underneath.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <WorkspaceMetaCard
                                label="Difficulty"
                                value={problem.difficulty}
                                tone={difficultyToneMap[problem.difficulty]}
                            />
                            <WorkspaceMetaCard label="Time Limit" value={`${problem.timeLimit}s`} />
                            <WorkspaceMetaCard label="Memory Limit" value={`${problem.memoryLimit}MB`} />
                        </div>
                    </div>
                </section>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
                    <section className="glass-panel section-fade flex min-h-[720px] flex-col overflow-hidden xl:sticky xl:top-6 xl:max-h-[calc(100vh-164px)]">
                        <div className="border-b border-white/10 bg-white/[0.03] px-6 py-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Problem Statement
                            </p>
                            <h2 className="mt-2 text-xl font-bold text-white">Description and constraints</h2>
                        </div>

                        <div className="code-scroll flex-1 overflow-y-auto p-6">
                            <div className="mb-5 flex flex-wrap gap-2">
                                <span
                                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                                        difficultyToneMap[problem.difficulty]
                                    }`}
                                >
                                    {problem.difficulty}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Time {problem.timeLimit}s
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Memory {problem.memoryLimit}MB
                                </span>
                            </div>

                            <div
                                className="text-sm leading-7 text-slate-300 [&_code]:rounded-md [&_code]:bg-white/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_pre]:mt-4 [&_pre]:overflow-x-auto [&_pre]:rounded-[22px] [&_pre]:border [&_pre]:border-white/10 [&_pre]:bg-dark-900/70 [&_pre]:p-4 [&_strong]:text-white"
                                dangerouslySetInnerHTML={createMarkup(problem.description)}
                            />
                        </div>
                    </section>

                    <div className="flex min-h-[720px] flex-col gap-6">
                        <section className="glass-panel section-fade overflow-hidden">
                            <div className="border-b border-white/10 bg-white/[0.03] px-4 py-4 md:px-6">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                            Editor
                                        </p>
                                        <h2 className="mt-2 text-xl font-bold text-white">Write and iterate</h2>
                                        <p className="mt-2 text-sm text-slate-400">
                                            Drafts autosave locally for each language.
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="relative min-w-[210px]">
                                            <select
                                                title="language"
                                                value={language}
                                                onChange={handleLanguageChange}
                                                className="soft-input appearance-none py-2.5 pr-10"
                                            >
                                                <option value="PYTHON">Python 3.10</option>
                                                <option value="JAVASCRIPT">Node.js</option>
                                                <option value="CPP">C++ (GCC 12)</option>
                                                <option value="JAVA">Java 17</option>
                                            </select>
                                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                        </div>

                                        <button
                                            onClick={() => handleExecute(true)}
                                            disabled={isExecuting}
                                            className="secondary-button disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {isExecuting ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Play className="h-4 w-4" />
                                            )}
                                            Run
                                        </button>
                                        <button
                                            onClick={() => handleExecute(false)}
                                            disabled={isExecuting}
                                            className="primary-button disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Send className="h-4 w-4" />
                                            Submit
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="h-[520px] min-h-[420px] bg-[#0a1020]">
                                <Editor
                                    height="100%"
                                    language={monacoLanguageMap[language]}
                                    theme="vs-dark"
                                    value={code}
                                    onChange={(value) => setCode(value || '')}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
                                        padding: { top: 16 },
                                        scrollBeyondLastLine: false,
                                        smoothScrolling: true
                                    }}
                                />
                            </div>
                        </section>

                        <section className="glass-panel section-fade flex min-h-[300px] flex-col overflow-hidden">
                            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-white/[0.03] p-3">
                                <ConsoleTab
                                    active={activeTab === 'testcases'}
                                    onClick={() => handleTabSwitch('testcases')}
                                >
                                    Test Cases
                                </ConsoleTab>
                                <ConsoleTab
                                    active={activeTab === 'result'}
                                    onClick={() => handleTabSwitch('result')}
                                >
                                    Test Result
                                </ConsoleTab>
                                <ConsoleTab
                                    active={activeTab === 'history'}
                                    onClick={() => handleTabSwitch('history')}
                                >
                                    <History className="h-3.5 w-3.5" />
                                    Submissions
                                </ConsoleTab>
                            </div>

                            <div className="code-scroll flex-1 overflow-y-auto p-4 md:p-5">
                                {activeTab === 'testcases' && (
                                    <div className="grid gap-3 lg:grid-cols-2">
                                        {visibleTestCases.map((testCase, index) => (
                                            <div
                                                key={testCase.id}
                                                className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
                                            >
                                                <div className="mb-3 flex items-center justify-between gap-3">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                        Example {index + 1}
                                                    </p>
                                                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                                        Visible
                                                    </span>
                                                </div>

                                                <ResultBlock label="Input" value={testCase.input} />
                                                <div className="mt-3">
                                                    <ResultBlock label="Expected Output" value={testCase.expectedOutput} />
                                                </div>
                                            </div>
                                        ))}

                                        {visibleTestCases.length === 0 && (
                                            <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">
                                                No visible test cases are available for this problem.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'result' && (
                                    <div className="h-full">
                                        {output ? (
                                            <ResultPanel output={output} detailText={detailText} />
                                        ) : isExecuting ? (
                                            <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 text-center">
                                                <Loader2 className="h-8 w-8 animate-spin text-sky-300" />
                                                <div>
                                                    <p className="font-semibold text-white">Executing in sandbox</p>
                                                    <p className="mt-1 text-sm text-slate-400">
                                                        We&apos;re polling for the result now.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center">
                                                <div className="metric-icon h-14 w-14 bg-white/5">
                                                    <Code2 className="h-6 w-6 text-slate-400" />
                                                </div>
                                                <h3 className="mt-4 text-lg font-semibold text-white">
                                                    Nothing run yet
                                                </h3>
                                                <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                                                    Run your code to inspect sample output, or submit to evaluate all
                                                    hidden test cases.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'history' && (
                                    <div className="space-y-3">
                                        {loadingHistory ? (
                                            <div className="flex min-h-[180px] items-center justify-center">
                                                <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
                                            </div>
                                        ) : history.length === 0 ? (
                                            <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">
                                                No submissions found for this problem yet.
                                            </div>
                                        ) : (
                                            history.map((submission) => (
                                                <button
                                                    key={submission.id}
                                                    onClick={() => setSelectedPastCode(submission)}
                                                    className="surface-card card-hover w-full p-4 text-left"
                                                >
                                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span
                                                                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                                                                        statusToneMap[submission.status] ||
                                                                        'border-slate-500/20 bg-slate-500/10 text-slate-300'
                                                                    }`}
                                                                >
                                                                    {formatStatus(submission.status)}
                                                                </span>
                                                                <span className="font-mono text-xs text-slate-500">
                                                                    {submission.language}
                                                                </span>
                                                            </div>
                                                            <p className="mt-3 text-sm text-slate-400">
                                                                {new Date(submission.createdAt).toLocaleString()}
                                                            </p>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-3 text-sm">
                                                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-slate-300">
                                                                {submission.runtime ? `${submission.runtime} ms` : '-'}
                                                            </span>
                                                            <span className="text-slate-500">Click to inspect code</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}

const CodeEditorLoading = () => (
    <div className="page-shell code-scroll">
        <div className="ambient-orb ambient-orb-cyan right-[4%] top-[30px] h-72 w-72" />
        <div className="ambient-orb ambient-orb-amber left-[-80px] top-[340px] h-80 w-80" />

        <div className="mx-auto max-w-[1600px] space-y-6">
            <div className="hero-panel animate-pulse">
                <div className="h-4 w-40 rounded-full bg-dark-700" />
                <div className="mt-5 h-12 w-full max-w-3xl rounded-2xl bg-dark-700" />
                <div className="mt-4 h-5 w-full max-w-xl rounded-full bg-dark-800" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
                <div className="glass-panel min-h-[720px] animate-pulse p-6">
                    <div className="h-5 w-40 rounded-full bg-dark-700" />
                    <div className="mt-6 space-y-3">
                        {Array.from({ length: 8 }).map((_, index) => (
                            <div key={index} className="h-4 rounded-full bg-dark-800" />
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass-panel animate-pulse p-6">
                        <div className="h-5 w-48 rounded-full bg-dark-700" />
                        <div className="mt-6 h-[420px] rounded-[24px] bg-dark-900" />
                    </div>
                    <div className="glass-panel animate-pulse p-6">
                        <div className="h-5 w-40 rounded-full bg-dark-700" />
                        <div className="mt-6 h-28 rounded-[24px] bg-dark-900" />
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const WorkspaceMetaCard = ({ label, value, tone }) => (
    <div className="surface-card min-w-[170px] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className={`mt-3 text-xl font-bold ${tone ? tone.split(' ').pop() : 'text-white'}`}>{value}</p>
    </div>
);

const ConsoleTab = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
            active
                ? 'bg-sky-400/15 text-white shadow-[inset_0_0_0_1px_rgba(125,211,252,0.28)]'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
        }`}
    >
        {children}
    </button>
);

const ResultBlock = ({ label, value }) => (
    <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <pre className="overflow-x-auto rounded-[18px] border border-white/10 bg-dark-900/70 p-3 font-mono text-sm text-slate-200 whitespace-pre-wrap">
            {value || '-'}
        </pre>
    </div>
);

const ResultPanel = ({ output, detailText }) => {
    const success = isSuccessStatus(output.status);
    const tone =
        statusToneMap[output.status] ||
        (success ? statusToneMap.ACCEPTED : 'border-rose-400/20 bg-rose-400/10 text-rose-300');

    return (
        <div className="space-y-4">
            <div className={`rounded-[24px] border p-5 ${tone}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="metric-icon h-12 w-12 bg-white/10">
                            {success ? (
                                <CheckCircle2 className="h-6 w-6" />
                            ) : (
                                <AlertTriangle className="h-6 w-6" />
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-80">
                                Latest Result
                            </p>
                            <h3 className="mt-1 text-xl font-bold">{formatStatus(output.status)}</h3>
                        </div>
                    </div>

                    {output.testcasesPassed !== undefined && (
                        <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                            Passed {output.testcasesPassed} / {output.totalTestcases}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                <div className="secondary-button px-4 py-3 font-normal">
                    <Clock3 className="h-4 w-4 text-amber-300" />
                    Runtime {output.runtime ? `${output.runtime} ms` : '-'}
                </div>
                <div className="secondary-button px-4 py-3 font-normal">
                    <Database className="h-4 w-4 text-emerald-300" />
                    Memory {output.memory ? `${output.memory} MB` : '-'}
                </div>
            </div>

            {(output.detail || output.errorMessage || output.stdout || output.error) && (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Details / Output
                    </p>
                    <pre className="overflow-x-auto rounded-[18px] border border-white/10 bg-dark-900/70 p-4 font-mono text-sm text-slate-200 whitespace-pre-wrap">
                        {detailText}
                    </pre>
                </div>
            )}
        </div>
    );
};
