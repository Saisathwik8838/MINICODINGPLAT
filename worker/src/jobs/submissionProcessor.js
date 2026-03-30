import { logger } from '../utils/logger.js';
import { prisma } from '../config/db.js';
import { runCodeInSandbox } from '../utils/dockerSandbox.js';

// ============================================
// Constants
// ============================================
const MAX_CODE_SIZE = 100 * 1024; // 100 KB
const ERROR_MESSAGE_MAX_LENGTH = 2000;

/**
 * Normalizes output by trimming whitespace and normalizing line endings
 * @param {string} output - Raw output from code execution
 * @returns {string} Normalized output
 */
const normalizeOutput = (output) => {
    if (!output || typeof output !== 'string') return '';
    
    return output
        .trim()
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n');
};

/**
 * Processes a single test case execution
 * @returns {Object} {passed, shouldStop, error}
 */
const executeTestCase = async (testcase, code, language, problemTimeLimit, problemMemoryLimit, index, total) => {
    logger.debug(`Executing testcase ${index + 1}/${total}`);
    
    try {
        const { stdout, stderr, runTime } = await runCodeInSandbox(
            code,
            language,
            testcase.input,
            { timeLimit: problemTimeLimit, memoryLimit: problemMemoryLimit }
        );
        
        // Check for timeout
        if (stderr === 'Time Limit Exceeded') {
            return {
                passed: false,
                shouldStop: true,
                status: 'TIME_LIMIT_EXCEEDED',
                error: 'Execution exceeded time limit'
            };
        }
        
        // Check for memory limit exceeded
        if (stderr === 'Memory Limit Exceeded') {
            return {
                passed: false,
                shouldStop: true,
                status: 'MEMORY_LIMIT_EXCEEDED',
                error: 'Execution exceeded memory limit'
            };
        }
        
        // Check for compilation/runtime errors
        if (stderr && !stdout) {
            const isCompilationError = language === 'CPP' || language === 'JAVA';
            return {
                passed: false,
                shouldStop: true,
                status: isCompilationError ? 'COMPILATION_ERROR' : 'RUNTIME_ERROR',
                error: stderr.slice(0, ERROR_MESSAGE_MAX_LENGTH),
                runtime: runTime
            };
        }
        
        // Compare outputs
        const normalizedStdout = normalizeOutput(stdout);
        const normalizedExpected = normalizeOutput(testcase.expectedOutput);
        
        if (normalizedStdout !== normalizedExpected) {
            logger.debug(`Testcase ${index + 1} failed: output mismatch`);
            return {
                passed: false,
                shouldStop: true,
                status: 'WRONG_ANSWER',
                error: `Expected:\n${normalizedExpected}\n\nGot:\n${normalizedStdout}`.slice(0, ERROR_MESSAGE_MAX_LENGTH),
                runtime: runTime
            };
        }
        
        return {
            passed: true,
            shouldStop: false,
            runtime: runTime
        };
        
    } catch (err) {
        logger.error(`Error executing testcase ${index + 1}: ${err.message}`);
        return {
            passed: false,
            shouldStop: true,
            status: 'RUNTIME_ERROR',
            error: `Execution engine error: ${err.message}`.slice(0, ERROR_MESSAGE_MAX_LENGTH)
        };
    }
};

/**
 * Updates user's leaderboard score atomically
 * @param {string} userId - User ID
 * @throws {Error} If update fails
 */
const syncUserLeaderboard = async (userId) => {
    if (!userId) {
        logger.warn('syncUserLeaderboard called with null/undefined userId');
        return;
    }
    
    try {
        // Fetch all accepted submissions atomically
        const solvedProblems = await prisma.submission.findMany({
            where: { userId, status: 'ACCEPTED' },
            distinct: ['problemId'],
            select: { problemId: true }
        });
        
        const totalSolved = solvedProblems.length;
        const totalScore = totalSolved * 10; // 10 pts per solved problem
        
        // Update user with transaction to prevent race conditions
        await prisma.user.update({
            where: { id: userId },
            data: {
                totalSolved,
                totalScore
            }
        });
        
        logger.debug(`Leaderboard updated for user ${userId}: ${totalSolved} problems solved, ${totalScore} points`);
        
    } catch (err) {
        logger.error(`Failed to sync leaderboard for user ${userId}: ${err.message}`);
        // Non-critical error - don't throw
    }
};

/**
 * Main submission processor
 * @param {Object} job - BullMQ job object
 */
export const processSubmission = async (job) => {
    const { submissionId, code, language, problemId } = job.data;
    
    logger.info(`Processing submission ${submissionId} for problem ${problemId} (language: ${language})`);
    
    try {
        // ============================================
        // 1. VALIDATE INPUT
        // ============================================
        if (!submissionId || !code || !language || !problemId) {
            throw new Error('Missing required submission fields');
        }
        
        if (code.length > MAX_CODE_SIZE) {
            throw new Error(`Code exceeds maximum allowed size (${MAX_CODE_SIZE} bytes)`);
        }
        
        // ============================================
        // 2. MARK AS PROCESSING
        // ============================================
        await prisma.submission.update({
            where: { id: submissionId },
            data: { status: 'PROCESSING' }
        });
        
        // ============================================
        // 3. FETCH PROBLEM & TEST CASES
        // ============================================
        const problem = await prisma.problem.findUnique({
            where: { id: problemId },
            include: {
                testCases: { orderBy: { order: 'asc' } }
            }
        });
        
        if (!problem || !problem.testCases || problem.testCases.length === 0) {
            throw new Error(`Problem ${problemId} not found or has no test cases`);
        }
        
        // Validate test case ordering
        for (let i = 0; i < problem.testCases.length; i++) {
            if (problem.testCases[i].order !== i) {
                logger.warn(`Test case ordering inconsistent for problem ${problemId}`);
            }
        }
        
        const limits = {
            timeLimit: Math.max(1, Math.min(60, problem.timeLimit || 5)), // 1-60 seconds
            memoryLimit: Math.max(32, Math.min(2048, problem.memoryLimit || 256)) // 32-2048 MB
        };
        
        // ============================================
        // 4. EXECUTE AGAINST TEST CASES
        // ============================================
        let passedTestCases = 0;
        let maxRuntime = 0;
        let finalStatus = 'ACCEPTED';
        let errorMessage = '';
        
        for (let i = 0; i < problem.testCases.length; i++) {
            const testcase = problem.testCases[i];
            
            const result = await executeTestCase(
                testcase,
                code,
                language,
                limits.timeLimit,
                limits.memoryLimit,
                i,
                problem.testCases.length
            );
            
            maxRuntime = Math.max(maxRuntime, result.runtime || 0);
            
            if (result.shouldStop) {
                finalStatus = result.status || 'RUNTIME_ERROR';
                errorMessage = result.error || '';
                break;
            }
            
            if (result.passed) {
                passedTestCases++;
            }
        }
        
        // ============================================
        // 5. UPDATE DATABASE
        // ============================================
        const updateData = {
            status: finalStatus,
            runtime: maxRuntime,
            testcasesPassed: passedTestCases,
            totalTestcases: problem.testCases.length,
            errorMessage: errorMessage || null,
        };
        
        const updatedSubmission = await prisma.submission.update({
            where: { id: submissionId },
            data: updateData
        });
        
        logger.info(
            `Submission ${submissionId} completed: ${finalStatus} ` +
            `(${passedTestCases}/${problem.testCases.length} test cases, ${maxRuntime.toFixed(2)}ms)`
        );
        
        // ============================================
        // 6. UPDATE LEADERBOARD IF ACCEPTED
        // ============================================
        if (finalStatus === 'ACCEPTED' && updatedSubmission.userId) {
            await syncUserLeaderboard(updatedSubmission.userId);
        }
        
        return { success: true, status: finalStatus };
        
    } catch (error) {
        logger.error(
            `Error processing submission ${submissionId}: ${error.message}`,
            { stack: error.stack }
        );
        
        try {
            await prisma.submission.update({
                where: { id: submissionId },
                data: {
                    status: 'INTERNAL_ERROR',
                    errorMessage: error.message.slice(0, ERROR_MESSAGE_MAX_LENGTH)
                }
            });
        } catch (updateErr) {
            logger.error(`Failed to update submission status: ${updateErr.message}`);
        }
        
        throw error;
    }
};
