import { logger } from '../utils/logger.js';
import { prisma } from '../config/db.js';
import { runCodeInSandbox } from '../utils/dockerSandbox.js';

export const processSubmission = async (job) => {
    const { submissionId, code, language, problemId } = job.data;

    logger.info(`Started processing submission ${submissionId} for problem ${problemId}`, { language });

    try {
        // 1. Mark as Processing
        await prisma.submission.update({
            where: { id: submissionId },
            data: { status: 'PROCESSING' },
        });

        // 2. Fetch Problem Constraints & Test Cases
        const problem = await prisma.problem.findUnique({
            where: { id: problemId },
            include: { testCases: { orderBy: { order: 'asc' } } }
        });

        if (!problem || !problem.testCases || problem.testCases.length === 0) {
            throw new Error('Problem or Test Cases not found');
        }

        const limits = {
            timeLimit: problem.timeLimit, // e.g., 5.0 seconds
            memoryLimit: problem.memoryLimit // e.g., 256 MB
        };

        // 3. Execution Engine: Run against each test case
        let passedTestCases = 0;
        let maxRuntime = 0;
        let maxMemory = 0; // Difficult to extract perfectly from naive docker run stdout, mocked for now
        let finalStatus = 'ACCEPTED';
        let errorMessage = '';

        for (const testcase of problem.testCases) {
            logger.debug(`Running testcase ${testcase.order + 1}/${problem.testCases.length}`);

            const { stdout, stderr, runTime } = await runCodeInSandbox(
                code,
                language,
                testcase.input,
                limits
            );

            maxRuntime = Math.max(maxRuntime, runTime);
            // Rough memory metric could be retrieved via docker stats in a prod environment
            maxMemory = Math.max(maxMemory, 12.5); // Mocked 12.5 MB for structural requirement

            // Check Execution State
            if (stderr === 'Time Limit Exceeded') {
                finalStatus = 'TIME_LIMIT_EXCEEDED';
                passedTestCases = 0; // Typically Leetcode counts 0 for failure records
                break;
            }

            if (stderr === 'Memory Limit Exceeded') {
                finalStatus = 'MEMORY_LIMIT_EXCEEDED';
                passedTestCases = 0;
                break;
            }

            if (stderr && !stdout) { // Compilation/Runtime Error
                finalStatus = language === 'CPP' || language === 'JAVA' && stderr.includes('error')
                    ? 'COMPILATION_ERROR'
                    : 'RUNTIME_ERROR';
                errorMessage = stderr.slice(0, 1000); // Cap error length
                break;
            }

            // 4. Compare Output vs Expected Output
            // Simple strict equality check for strings. Real systems often need whitespace normalization.
            const normalizedStdout = stdout.trim().replace(/\r\n/g, '\n');
            const normalizedExpected = testcase.expectedOutput.trim().replace(/\r\n/g, '\n');

            if (normalizedStdout !== normalizedExpected) {
                finalStatus = 'WRONG_ANSWER';
                break; // Stop at first failure
            }

            passedTestCases++;
        }

        // 5. Database Update & Leaderboard logic
        logger.info(`Finished processing submission ${submissionId}: ${finalStatus}`);

        await prisma.submission.update({
            where: { id: submissionId },
            data: {
                status: finalStatus,
                runtime: maxRuntime,
                memory: maxMemory,
                testcasesPassed: passedTestCases,
                totalTestcases: problem.testCases.length,
                errorMessage: errorMessage || null
            },
        });

        // If perfectly accepted, async update user stats (Leaderboard trigger)
        if (finalStatus === 'ACCEPTED') {
            const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
            await syncUserLeaderboard(submission.userId);
        }

    } catch (error) {
        logger.error(`Error processing submission ${submissionId}: ${error.message}`);

        await prisma.submission.update({
            where: { id: submissionId },
            data: {
                status: 'INTERNAL_ERROR',
                errorMessage: error.message
            },
        });

        throw error;
    }
};

/**
 * Updates the User's overall score on successful submission
 */
const syncUserLeaderboard = async (userId) => {
    // Count distinct problem IDs where submission status is ACCEPTED
    const solvedProblems = await prisma.submission.findMany({
        where: { userId, status: 'ACCEPTED' },
        distinct: ['problemId'],
        select: { problemId: true }
    });

    const totalPoints = solvedProblems.length * 10; // Hardcoded scaling rule: 10 pts per solved problem

    await prisma.user.update({
        where: { id: userId },
        data: {
            totalSolved: solvedProblems.length,
            totalScore: totalPoints
        }
    });

    logger.debug(`Synchronized Leaderboard score for user ${userId}. Total: ${totalPoints}`);
};
