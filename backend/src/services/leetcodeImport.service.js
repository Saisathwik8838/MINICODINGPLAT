import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middlewares/errorHandler.js';

export const importProblems = async (normalizedProblems, options = {}) => {
    const {
        skipExisting = true,
        overwrite = false,
        batchSize = 50
    } = options;

    const result = {
        total: normalizedProblems.length,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: []
    };

    for (let i = 0; i < normalizedProblems.length; i++) {
        const problem = normalizedProblems[i];
        
        try {
            const existing = await prisma.problem.findUnique({
                where: { slug: problem.slug }
            });

            if (existing && skipExisting && !overwrite) {
                result.skipped++;
                continue;
            }

            const { title, slug, description, difficulty, timeLimit, memoryLimit, isActive } = problem;

            await prisma.$transaction(async (tx) => {
                const upserted = await tx.problem.upsert({
                    where: { slug },
                    create: { title, slug, description, difficulty, timeLimit, memoryLimit, isActive },
                    update: overwrite ? { title, description, difficulty, timeLimit, memoryLimit } : {}
                });

                if (overwrite || (!existing && upserted)) {
                    await tx.testCase.deleteMany({ where: { problemId: upserted.id } });
                    
                    if (problem.testCases && problem.testCases.length > 0) {
                        const tcData = problem.testCases.map(tc => ({
                            input: tc.input,
                            expectedOutput: tc.expectedOutput,
                            isHidden: tc.isHidden,
                            order: tc.order,
                            problemId: upserted.id
                        }));
                        await tx.testCase.createMany({ data: tcData });
                    }
                }
            });

            if (existing && overwrite) {
                result.updated++;
            } else if (!existing) {
                result.created++;
            } else {
                result.skipped++;
            }
        } catch (error) {
            logger.error(`Failed to import problem ${problem.slug}: ${error.message}`);
            result.failed++;
            result.errors.push({ slug: problem.slug, error: error.message });
        }
    }

    return result;
};

export const getImportStats = async () => {
    const totalProblems = await prisma.problem.count();
    const totalTestCases = await prisma.testCase.count();
    
    const groupByDifficulty = await prisma.problem.groupBy({
        by: ['difficulty'],
        _count: {
            id: true
        }
    });
    
    const byDifficulty = { EASY: 0, MEDIUM: 0, HARD: 0 };
    for (const group of groupByDifficulty) {
        byDifficulty[group.difficulty] = group._count.id;
    }

    return {
        totalProblems,
        totalTestCases,
        byDifficulty
    };
};

export const previewImport = async (normalizedProblems, limit = 10) => {
    const slugs = normalizedProblems.map(p => p.slug);
    
    const existing = await prisma.problem.findMany({
        where: { slug: { in: slugs } },
        select: { slug: true }
    });
    
    const existingSlugs = existing.map(e => e.slug);
    
    let willSkip = 0;
    let willCreate = 0;
    
    for (const p of normalizedProblems) {
        if (existingSlugs.includes(p.slug)) {
            willSkip++;
        } else {
            willCreate++;
        }
    }
    
    const sample = normalizedProblems.slice(0, 5).map(p => {
        const { testCases, ...rest } = p;
        return rest;
    });
    
    const totalTestCases = normalizedProblems.reduce((sum, p) => sum + (p.testCases ? p.testCases.length : 0), 0);
    
    return {
        sample,
        willCreate,
        willSkip,
        totalTestCases,
        existingSlugs
    };
};
