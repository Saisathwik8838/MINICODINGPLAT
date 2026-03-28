import { fetchSplit, fetchAllRows } from '../src/services/leetcodeDataset.service.js';
import { normalizeAll } from '../src/services/leetcodeNormalizer.service.js';
import { importProblems, previewImport } from '../src/services/leetcodeImport.service.js';
import { prisma } from '../src/config/db.js';

const parseArgs = () => {
    const args = process.argv.slice(2);
    const options = {
        limit: 100,
        split: 'train',
        overwrite: false,
        preview: false,
        slug: null,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--limit' && args[i + 1]) {
            options.limit = parseInt(args[i + 1], 10);
            i++;
        } else if (args[i] === '--split' && args[i + 1]) {
            options.split = args[i + 1];
            i++;
        } else if (args[i] === '--overwrite') {
            options.overwrite = true;
        } else if (args[i] === '--preview') {
            options.preview = true;
        } else if (args[i] === '--slug' && args[i + 1]) {
            options.slug = args[i + 1];
            i++;
        } else if (args[i] === '--help') {
            options.help = true;
        }
    }
    return options;
};

const showHelp = () => {
    console.log(`
╔══════════════════════════════════════╗
║   MiniLeetCode — Dataset Importer   ║
╚══════════════════════════════════════╝

Supported flags:
  --limit N         Number of problems (default 100)
  --split train|test (default train)
  --overwrite       Boolean flag (default false)
  --preview         Boolean flag — show preview, no DB write
  --slug SLUG       Import single problem
  --help            Show help text
`);
    process.exit(0);
};

const main = async () => {
    const options = parseArgs();

    if (options.help) {
        showHelp();
    }

    console.log(`\n╔══════════════════════════════════════╗`);
    console.log(`║   MiniLeetCode — Dataset Importer   ║`);
    console.log(`╚══════════════════════════════════════╝\n`);

    try {
        let rawRows = [];
        
        if (options.slug) {
            console.log(`Fetching rows to find slug: ${options.slug}...`);
            const allRows = await fetchAllRows(2641);
            const match = allRows.find(r => r.question === options.slug);
            if (!match) {
                console.log(`❌ Problem with slug ${options.slug} not found in dataset.`);
                process.exit(1);
            }
            rawRows = [match];
        } else if (options.split === 'test') {
            process.stdout.write(`\rFetching test split (up to ${options.limit} rows)...`);
            const { rows } = await fetchSplit('test', 0, options.limit);
            rawRows = rows.map(r => r.row || r);
            console.log();
        } else {
            rawRows = await fetchAllRows(options.limit, (collected, total) => {
                const percent = Math.min(100, Math.floor((collected / total) * 100));
                const bars = Math.max(0, Math.min(20, Math.floor(percent / 5)));
                const barStr = '█'.repeat(bars) + '░'.repeat(20 - bars);
                process.stdout.write(`\rFetching rows... [${barStr}] ${percent}% (${Math.min(collected, Math.max(1, total))}/${total})`);
            });
            console.log(); 
        }

        const normalized = normalizeAll(rawRows);

        if (options.preview) {
            const preview = await previewImport(normalized, options.limit);
            console.log(`\nPreview Sample`);
            console.log(`Slug                     | Difficulty | Test Cases`);
            console.log(`----------------------------------------------------`);
            for (const p of preview.sample) {
                const tcCount = normalized.find(n => n.slug === p.slug)?.testCases?.length || 0;
                console.log(`${p.slug.padEnd(24)} | ${p.difficulty.padEnd(10)} | ${tcCount}`);
            }
            console.log(`\nSummary:`);
            console.log(`- ${preview.willCreate} new problems will be created`);
            console.log(`- ${preview.willSkip} existing problems will be skipped`);
            console.log(`- ${preview.totalTestCases} total test cases`);
        } else {
            console.log(`\nImporting to Database...`);
            const result = await importProblems(normalized, {
                skipExisting: !options.overwrite,
                overwrite: options.overwrite,
                batchSize: 50
            });

            console.log(`\n┌─────────────────────────────────────┐`);
            console.log(`│         Import Complete             │`);
            console.log(`├─────────────────┬───────────────────┤`);
            console.log(`│ Problems Found  │ ${result.total.toString().padEnd(17)} │`);
            console.log(`│ Created         │ ${result.created.toString().padEnd(17)} │`);
            console.log(`│ Skipped         │ ${result.skipped.toString().padEnd(17)} │`);
            console.log(`│ Failed          │ ${result.failed.toString().padEnd(17)} │`);
            const tcCount = normalized.reduce((sum, p) => sum + (p.testCases ? p.testCases.length : 0), 0);
            console.log(`│ Test Cases      │ ${tcCount.toString().padEnd(17)} │`);
            console.log(`└─────────────────┴───────────────────┘`);
        }
    } catch (error) {
        console.error(`\n❌ Import failed:`, error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
};

main();
