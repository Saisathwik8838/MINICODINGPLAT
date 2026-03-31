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
 * @returns {Object} {passed, shouldStop, status, error, runtime}
 */
const executeTestCase = async (testcase, code, language, index, total) => {
    logger.debug(`Executing testcase ${index + 1}/${total}`);
    
    try {
        const result = await runCodeInSandbox(language, code, testcase.input);
        const { stdout, stderr, runTime, status } = result;
        
        // Handle explicit sandbox statuses
        if (status === 'TIMEOUT') {
            return {
                passed: false,
                shouldStop: true,
                status: 'TIME_LIMIT_EXCEEDED',
                error: 'Execution exceeded time limit',
                runtime: runTime
            };
        }

        if (status === 'COMPILATION_ERROR') {
            return {
                passed: false,
                shouldStop: true,
                status: 'COMPILATION_ERROR',
                error: stderr.slice(0, ERROR_MESSAGE_MAX_LENGTH),
                runtime: 0
            };
        }

        if (status === 'RUNTIME_ERROR') {
            return {
                passed: false,
                shouldStop: true,
                status: 'RUNTIME_ERROR',
                error: stderr.slice(0, ERROR_MESSAGE_MAX_LENGTH),
                runtime: runTime
            };
        }

        if (status === 'INTERNAL_ERROR') {
            return {
                passed: false,
                shouldStop: true,
                status: 'INTERNAL_ERROR',
                error: stderr.slice(0, ERROR_MESSAGE_MAX_LENGTH),
                runtime: 0
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
            status: 'ACCEPTED',
            runtime: runTime
        };
        
    } catch (err) {
        logger.error(`Error executing testcase ${index + 1}: ${err.message}`);
        return {
            passed: false,
            shouldStop: true,
            status: 'INTERNAL_ERROR',
            error: `Execution engine crash: ${err.message}`.slice(0, ERROR_MESSAGE_MAX_LENGTH),
            runtime: 0
        };
    }
};

/**
 * Updates user's leaderboard score atomically
 */
const syncUserLeaderboard = async (userId) => {
    if (!userId) return;
    try {
        const solvedProblems = await prisma.submission.findMany({
            where: { userId, status: 'ACCEPTED' },
            distinct: ['problemId'],
            select: { problemId: true }
        });
        
        const totalSolved = solvedProblems.length;
        const totalScore = totalSolved * 10;
        
        await prisma.user.update({
            where: { id: userId },
            data: { totalSolved, totalScore }
        });
    } catch (err) {
        logger.error(`Failed to sync leaderboard for user ${userId}: ${err.message}`);
    }
};

/**
 * Main submission processor
 */
export const processSubmission = async (job) => {
    const { submissionId, code, language, problemId } = job.data;
    
    logger.info(`Processing submission ${submissionId} for problem ${problemId} (language: ${language})`);
    
    try {
        if (!submissionId || !code || !language || !problemId) {
            throw new Error('Missing required submission fields');
        }
        
        if (code.length > MAX_CODE_SIZE) {
            throw new Error(`Code exceeds maximum allowed size (${MAX_CODE_SIZE} bytes)`);
        }
        
        await prisma.submission.update({
            where: { id: submissionId },
            data: { status: 'PROCESSING' }
        });
        
        const problem = await prisma.problem.findUnique({
            where: { id: problemId },
            include: {
                testCases: { orderBy: { order: 'asc' } }
            }
        });
        
        if (!problem || !problem.testCases || problem.testCases.length === 0) {
            throw new Error(`Problem ${problemId} not found or has no test cases`);
        }
        
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
                i,
                problem.testCases.length
            );
            
            maxRuntime = Math.max(maxRuntime, result.runtime || 0);
            
            if (result.shouldStop) {
                finalStatus = result.status;
                errorMessage = result.error || '';
                // If it's a structural failure (INTERNAL ERROR), we might want to log more
                if (finalStatus === 'INTERNAL_ERROR') {
                    logger.error(`Critical Internal Error during submission ${submissionId}: ${errorMessage}`);
                }
                break;
            }
            
            if (result.passed) {
                passedTestCases++;
            }
        }
        
        const updatedSubmission = await prisma.submission.update({
            where: { id: submissionId },
            data: {
                status: finalStatus,
                runtime: maxRuntime,
                testcasesPassed: passedTestCases,
                totalTestcases: problem.testCases.length,
                errorMessage: errorMessage || null,
            }
        });
        
        logger.info(
            `Submission ${submissionId} completed: ${finalStatus} ` +
            `(${passedTestCases}/${problem.testCases.length} test cases, ${maxRuntime.toFixed(2)}ms)`
        );
        
        if (finalStatus === 'ACCEPTED' && updatedSubmission.userId) {
            await syncUserLeaderboard(updatedSubmission.userId);
        }
        
        return { success: true, status: finalStatus };
        
    } catch (error) {
        logger.error(`Error processing submission ${submissionId}: ${error.message}`);
        
        await prisma.submission.update({
            where: { id: submissionId },
            data: {
                status: 'INTERNAL_ERROR',
                errorMessage: error.message.slice(0, ERROR_MESSAGE_MAX_LENGTH)
            }
        }).catch(e => logger.error(`Retry status update failed: ${e.message}`));
        
        throw error;
    }
};
