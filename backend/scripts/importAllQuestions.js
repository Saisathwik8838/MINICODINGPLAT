#!/usr/bin/env node
/**
 * Bulk Import All LeetCode Questions from HuggingFace Dataset
 * 
 * This script imports ALL 2641 LeetCode problems with their test cases
 * Usage: node importAllQuestions.js [--overwrite]
 * 
 * Options:
 *   --overwrite    Replace existing problems in database
 *   --limit N      Import only N problems (default: all 2641)
 *   --skip-existing Skip problems that already exist (default behavior)
 */

import { fetchAllRows, fetchSplit } from '../src/services/leetcodeDataset.service.js';
import { normalizeAll } from '../src/services/leetcodeNormalizer.service.js';
import { importProblems, getImportStats } from '../src/services/leetcodeImport.service.js';
import { prisma } from '../src/config/db.js';

const parseArgs = () => {
    const args = process.argv.slice(2);
    return {
        overwrite: args.includes('--overwrite'),
        limit: args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : 2641,
        skipExisting: !args.includes('--skip-none'),
        verbose: args.includes('--verbose'),
        help: args.includes('--help')
    };
};

const showHelp = () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║   MiniLeetCode — Bulk Question Importer              ║
║   Import all 2641 LeetCode problems with test cases  ║
╚══════════════════════════════════════════════════════╝

Usage:  node importAllQuestions.js [options]

Options:
  --help              Show this help message
  --overwrite         Replace existing problems (default: skip)
  --limit N           Import only N problems (default: 2641)
  --verbose           Show detailed progress
  --skip-existing     Skip existing problems (default)

Examples:
  # Import all 2641 problems
  node importAllQuestions.js

  # Replace all existing problems
  node importAllQuestions.js --overwrite

  # Import first 500 problems
  node importAllQuestions.js --limit 500

  # Verbose output
  node importAllQuestions.js --verbose
    `);
};

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const options = parseArgs();

    if (options.help) {
        showHelp();
        process.exit(0);
    }

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  STARTING BULK IMPORT                  ║');
    console.log('╚════════════════════════════════════════╝\n');

    const startTime = Date.now();

    try {
        // Get initial stats
        console.log('📊 Current database stats:');
        const initialStats = await getImportStats();
        console.log(`   Problems: ${initialStats.totalProblems}`);
        console.log(`   Test cases: ${initialStats.totalTestCases}`);
        console.log(`   By difficulty: Easy=${initialStats.byDifficulty.EASY}, Medium=${initialStats.byDifficulty.MEDIUM}, Hard=${initialStats.byDifficulty.HARD}`);

        // Clear database if --overwrite
        if (options.overwrite) {
            console.log('\n🗑️  Clearing existing problems (--overwrite flag set)...');
            await prisma.testCase.deleteMany({});
            await prisma.problem.deleteMany({});
            console.log('✓ Database cleared');
        }

        // Fetch all problems from HuggingFace
        console.log(`\n📥 Fetching ${options.limit} problems from HuggingFace LeetCode Dataset...`);
        const fetchStart = Date.now();
        const allRows = await fetchAllRows(options.limit, (current, total) => {
            const percent = ((current / total) * 100).toFixed(1);
            process.stdout.write(`\r   ${current}/${total} (${percent}%) `);
        });
        const fetchDuration = ((Date.now() - fetchStart) / 1000).toFixed(2);
        console.log(`\n✓ Fetched ${allRows.length} problems in ${fetchDuration}s`);

        // Normalize problems
        console.log('\n🔄 Normalizing problems and test cases...');
        const normalizeStart = Date.now();
        const normalizedProblems = normalizeAll(allRows);
        const normalizeDuration = ((Date.now() - normalizeStart) / 1000).toFixed(2);
        console.log(`✓ Normalized ${normalizedProblems.length} problems in ${normalizeDuration}s`);

        // Show sample
        if (normalizedProblems.length > 0 && options.verbose) {
            console.log('\n📄 Sample problem:');
            const sample = normalizedProblems[0];
            console.log(`   Title: ${sample.title}`);
            console.log(`   Difficulty: ${sample.difficulty}`);
            console.log(`   Test cases: ${sample.testCases?.length || 0}`);
        }

        // Import problems
        console.log('\n💾 Importing problems to database...');
        const importStart = Date.now();
        let lastLog = 0;
        const importResult = await importProblems(normalizedProblems, {
            skipExisting: options.skipExisting && !options.overwrite,
            overwrite: options.overwrite,
            batchSize: 50
        });
        const importDuration = ((Date.now() - importStart) / 1000).toFixed(2);

        // Display results
        console.log(`\n✅ Import completed in ${importDuration}s`);
        console.log('\n📈 Import Results:');
        console.log(`   Total processed:  ${importResult.total}`);
        console.log(`   ✓ Created:        ${importResult.created}`);
        console.log(`   ↻ Updated:        ${importResult.updated}`);
        console.log(`   ⊘ Skipped:        ${importResult.skipped}`);
        console.log(`   ✗ Failed:         ${importResult.failed}`);

        if (importResult.failed > 0) {
            console.log('\n❌ Failed imports:');
            importResult.errors.slice(0, 5).forEach(err => {
                console.log(`   - ${err.slug}: ${err.error}`);
            });
            if (importResult.errors.length > 5) {
                console.log(`   ... and ${importResult.errors.length - 5} more`);
            }
        }

        // Get final stats
        console.log('\n📊 Final database stats:');
        const finalStats = await getImportStats();
        console.log(`   Problems: ${finalStats.totalProblems}`);
        console.log(`   Test cases: ${finalStats.totalTestCases}`);
        console.log(`   By difficulty: Easy=${finalStats.byDifficulty.EASY}, Medium=${finalStats.byDifficulty.MEDIUM}, Hard=${finalStats.byDifficulty.HARD}`);

        // Total time
        const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n⏱️  Total time: ${totalDuration}s`);

        console.log('\n╔════════════════════════════════════════╗');
        console.log('║  ✅ IMPORT COMPLETE                   ║');
        console.log('╚════════════════════════════════════════╝\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Import failed:');
        console.error(`   ${error.message}`);
        console.error(`\nStack: ${error.stack}`);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run
main().catch(err => {
    console.error(chalk.red('Fatal error:'), err);
    process.exit(1);
});
