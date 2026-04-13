import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed...');

    // 1. Upsert Admin User
    const adminEmail = 'admin@minileetcode.com';
    const adminPasswordMatch = 'Admin@123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPasswordMatch, salt);

    const adminUser = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            username: 'admin',
            email: adminEmail,
            role: 'ADMIN',
            passwordHash: passwordHash
        }
    });
    console.log(`Created admin user: ${adminUser.username} (${adminUser.email})`);

    console.log('\n📥 Importing 2000 problems from LeetCodeDataset...');
    try {
        const { fetchAllRows } = await import('../src/services/leetcodeDataset.service.js');
        const { normalizeAll } = await import('../src/services/leetcodeNormalizer.service.js');
        const { importProblems } = await import('../src/services/leetcodeImport.service.js');

        const allRows = await fetchAllRows(2000);
        const normalized = normalizeAll(allRows);
        const result = await importProblems(normalized, {
            skipExisting: true,
            overwrite: false
        });

        console.log(`✅ Import complete:`);
        console.log(`   Created:  ${result.created} problems`);
        console.log(`   Skipped:  ${result.skipped} (already existed)`);
        console.log(`   Failed:   ${result.failed}`);
        const tcCount = normalized.reduce((sum, p) => sum + p.testCases.length, 0);
        console.log(`   Test cases: ~${tcCount} total`);
    } catch (err) {
        console.warn('\n⚠️  Dataset import failed:', err.message);
        console.warn('   This is non-fatal. Problems can be imported');
        console.warn('   from the Admin Panel → Import tab.\n');
    }

    console.log('Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
