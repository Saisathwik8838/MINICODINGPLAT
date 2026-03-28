import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { generatorRegistry, getSupportedSlugs } from '../generators/index.js';
import { AppError } from '../middlewares/errorHandler.js';

export const validateTestCases = (testCases) => {
    if (!Array.isArray(testCases) || testCases.length === 0) {
        throw new AppError('Test case validation failed: Array is empty', 422);
    }
    for (const tc of testCases) {
        if (!tc.input || typeof tc.input !== 'string') throw new AppError('Test case validation failed: Invalid input string', 422);
        if (!tc.expectedOutput || typeof tc.expectedOutput !== 'string') throw new AppError('Test case validation failed: Invalid expectedOutput string', 422);
        if (tc.input === 'undefined' || tc.input === 'null') throw new AppError('Test case validation failed: input contains undefined or null literal', 422);
        if (tc.expectedOutput === 'undefined' || tc.expectedOutput === 'null') throw new AppError('Test case validation failed: expectedOutput contains undefined or null literal', 422);
    }
};

export const bulkInsertTestCases = async (problemId, testCases) => {
    const data = testCases.map(tc => ({ ...tc, problemId }));
    
    await prisma.$transaction(async (tx) => {
        await tx.testCase.deleteMany({ where: { problemId } });
        await tx.testCase.createMany({ data });
    });
    
    return testCases.length;
};

export const generateForProblem = async (problemId) => {
    const problem = await prisma.problem.findUnique({
        where: { id: problemId },
        select: { id: true, slug: true, title: true }
    });
    if (!problem) throw new AppError('Problem not found', 404);

    const generator = generatorRegistry[problem.slug];
    if (!generator) {
        throw new AppError(`No generator available for slug "${problem.slug}". Supported: ${getSupportedSlugs().join(', ')}`, 400);
    }

    const cases = generator.generateCases();
    validateTestCases(cases);

    await bulkInsertTestCases(problemId, cases);
    logger.info(`Generated ${cases.length} test cases for problem: ${problem.slug}`);

    return { generated: cases.length, problemId, slug: problem.slug };
};

export const regenerateTestCases = async (problemId) => {
    return await generateForProblem(problemId);
};
