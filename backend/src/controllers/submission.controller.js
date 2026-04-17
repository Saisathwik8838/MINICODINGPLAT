import { prisma } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { logger } from '../utils/logger.js';
import { runCodeInSandbox } from '../utils/dockerSandbox.js';
import { normalizeTestCaseInput } from '../utils/testcaseInput.js';
import { compareOutput } from '../utils/compareOutput.js';

const MAX_CODE_SIZE = 100 * 1024; // 100 KB
const ERROR_MESSAGE_MAX_LENGTH = 2000;

const normalizeOutput = (output) => {
    if (!output || typeof output !== 'string') return '';
    return output.trim().split('\n').map(line => line.trimEnd()).join('\n');
};

const executeTestCase = async (testcase, code, language, index, total) => {
    logger.debug(`Executing testcase ${index + 1}/${total}`);
    try {
        const normalizedInput = normalizeTestCaseInput(testcase.input);
        const result = await runCodeInSandbox(language, code, normalizedInput);
        const { stdout, stderr, runTime, status } = result;
        
        if (status === 'TIMEOUT') return { passed: false, shouldStop: true, status: 'TIME_LIMIT_EXCEEDED', error: 'Execution exceeded time limit', runtime: runTime };
        if (status === 'COMPILATION_ERROR') return { passed: false, shouldStop: true, status: 'COMPILATION_ERROR', error: stderr.slice(0, ERROR_MESSAGE_MAX_LENGTH), runtime: 0 };
        if (status === 'RUNTIME_ERROR') return { passed: false, shouldStop: true, status: 'RUNTIME_ERROR', error: stderr.slice(0, ERROR_MESSAGE_MAX_LENGTH), runtime: runTime };
        if (status === 'INTERNAL_ERROR') return { passed: false, shouldStop: true, status: 'INTERNAL_ERROR', error: stderr.slice(0, ERROR_MESSAGE_MAX_LENGTH), runtime: 0 };
        
        const normalizedStdout = normalizeOutput(stdout);
        const normalizedExpected = normalizeOutput(testcase.expectedOutput);
        
        if (!compareOutput(normalizedExpected, normalizedStdout)) {
            logger.debug(`Testcase ${index + 1} failed: output mismatch`);
            return { passed: false, shouldStop: true, status: 'WRONG_ANSWER', error: `Expected:\n${normalizedExpected}\n\nGot:\n${normalizedStdout}`.slice(0, ERROR_MESSAGE_MAX_LENGTH), runtime: runTime };
        }
        return { passed: true, shouldStop: false, status: 'ACCEPTED', runtime: runTime };
    } catch (err) {
        logger.error(`Error executing testcase ${index + 1}: ${err.message}`);
        return { passed: false, shouldStop: true, status: 'INTERNAL_ERROR', error: `Execution engine crash: ${err.message}`.slice(0, ERROR_MESSAGE_MAX_LENGTH), runtime: 0 };
    }
};

const syncUserScore = async (userId) => {
    if (!userId) return;
    try {
        const solvedProblems = await prisma.submission.findMany({
            where: { userId, status: 'ACCEPTED' },
            distinct: ['problemId'],
            select: { problemId: true }
        });
        const totalSolved = solvedProblems.length;
        const totalScore = totalSolved * 10;
        await prisma.user.update({ where: { id: userId }, data: { totalSolved, totalScore } });
    } catch (err) {
        logger.error(`Failed to sync leaderboard for user ${userId}: ${err.message}`);
    }
};

const processSubmission = async (submissionId, code, language, problemId) => {
    logger.info(`Processing submission ${submissionId} for problem ${problemId} (language: ${language})`);
    try {
        if (!submissionId || !code || !language || !problemId) throw new Error('Missing required submission fields');
        if (code.length > MAX_CODE_SIZE) throw new Error(`Code exceeds maximum allowed size (${MAX_CODE_SIZE} bytes)`);
        
        const problem = await prisma.problem.findUnique({
            where: { id: problemId },
            include: { testCases: { orderBy: { order: 'asc' } } }
        });
        if (!problem || !problem.testCases || problem.testCases.length === 0) throw new Error(`Problem ${problemId} not found or has no test cases`);
        
        let passedTestCases = 0;
        let maxRuntime = 0;
        let finalStatus = 'ACCEPTED';
        let errorMessage = '';
        
        for (let i = 0; i < problem.testCases.length; i++) {
            const testcase = problem.testCases[i];
            const result = await executeTestCase(testcase, code, language, i, problem.testCases.length);
            maxRuntime = Math.max(maxRuntime, result.runtime || 0);
            
            if (result.shouldStop) {
                finalStatus = result.status;
                errorMessage = result.error || '';
                if (finalStatus === 'INTERNAL_ERROR') logger.error(`Critical Internal Error during submission ${submissionId}: ${errorMessage}`);
                break;
            }
            if (result.passed) passedTestCases++;
        }
        
        const updatedSubmission = await prisma.submission.update({
            where: { id: submissionId },
            data: { status: finalStatus, runtime: maxRuntime, testcasesPassed: passedTestCases, totalTestcases: problem.testCases.length, errorMessage: errorMessage || null }
        });
        
        logger.info(`Submission ${submissionId} completed: ${finalStatus} (${passedTestCases}/${problem.testCases.length} test cases, ${maxRuntime.toFixed(2)}ms)`);
        if (finalStatus === 'ACCEPTED' && updatedSubmission.userId) await syncUserScore(updatedSubmission.userId);
    } catch (error) {
        logger.error(`Error processing submission ${submissionId}: ${error.message}`);
        await prisma.submission.update({
            where: { id: submissionId },
            data: { status: 'INTERNAL_ERROR', errorMessage: error.message.slice(0, ERROR_MESSAGE_MAX_LENGTH) }
        }).catch(e => logger.error(`Retry status update failed: ${e.message}`));
    }
};

export const createSubmission = async (req, res, next) => {
    try {
        const { code, language, problemId, isRun } = req.body;
        const userId = req.user.userId;

        if (!code || !language || !problemId) {
            return next(new AppError('Please provide code, language, and problemId', 400));
        }

        const submission = await prisma.submission.create({
            data: { userId, problemId, language: language.toUpperCase(), code, status: 'PROCESSING' }
        });

        res.status(202).json({
            status: 'success',
            data: { submissionId: submission.id }
        });

        processSubmission(submission.id, code, language.toUpperCase(), problemId);
    } catch (error) {
        next(error);
    }
};

export const getSubmission = async (req, res, next) => {
    try {
        const { id } = req.params;
        const submission = await prisma.submission.findUnique({
            where: { id },
            include: { problem: { select: { title: true, slug: true } }, user: { select: { username: true } } }
        });
        if (!submission) return next(new AppError('Submission not found', 404));
        res.status(200).json({ status: 'success', data: { submission } });
    } catch (error) {
        next(error);
    }
};

export const getUserSubmissions = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { page = 1, limit = 20, problemId, status, language } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = { userId };
        
        if (problemId) where.problemId = problemId;
        if (status) where.status = status;
        if (language) where.language = language.toUpperCase();
        
        const [submissions, total] = await Promise.all([
            prisma.submission.findMany({ where, skip, take: limitNum, orderBy: { createdAt: 'desc' }, include: { problem: { select: { title: true, slug: true } } } }),
            prisma.submission.count({ where })
        ]);
        res.status(200).json({ status: 'success', data: { submissions, pagination: { total, page: pageNum, totalPages: Math.ceil(total / limitNum) } } });
    } catch (error) {
        next(error);
    }
};
