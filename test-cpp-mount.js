#!/usr/bin/env node
/**
 * Direct Volume Mount Test for C++ Compilation
 */

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const testDir = path.join(process.cwd(), 'tmp', 'cpp-mount-test');
const cppFile = path.join(testDir, 'solution.cpp');

console.log('🧪 C++ Volume Mount & Compilation Test\n');
console.log(`Test directory: ${testDir}\n`);

// Create test directory
if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
    console.log('✓ Created test directory');
} else {
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir, { recursive: true });
    console.log('✓ Cleaned and created test directory');
}

// Write C++ file
const cppCode = `#include <iostream>
int main() {
    int a, b;
    std::cin >> a >> b;
    std::cout << (a + b) << std::endl;
    return 0;
}`;

fs.writeFileSync(cppFile, cppCode, 'utf-8');
console.log('✓ Created solution.cpp');

// Set permissions
fs.chmodSync(testDir, 0o777);
fs.chmodSync(cppFile, 0o666);
console.log('✓ Set permissions\n');

// Convert path for Docker on Windows
let dockerPath = testDir;
if (process.platform === 'win32') {
    dockerPath = testDir
        .replace(/\\/g, '/')
        .replace(/^([A-Z]):/, (match, drive) => `/${drive.toLowerCase()}`)
        .replace(/\/$/, '');
}

console.log(`Local path: ${testDir}`);
console.log(`Docker path: ${dockerPath}\n`);

// Test 1: Volume mount check
console.log('📤 Test 1: Verifying volume mount...');
const volumeTestCmd = `docker run --rm -v='${dockerPath}:/test' alpine:latest sh -c "ls -la /test && cat /test/solution.cpp"`;
console.log(`Command: ${volumeTestCmd}\n`);

exec(volumeTestCmd, { shell: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) {
        console.log('❌ Volume mount test FAILED');
        console.log(`Error: ${stderr || error.message}\n`);
        cleanup();
        process.exit(1);
    }
    
    if (stdout.includes('solution.cpp')) {
        console.log('✓ Volume mount test PASSED\n');
    } else {
        console.log('❌ File not found in mounted volume');
        console.log(`Output: ${stdout}\n`);
        cleanup();
        process.exit(1);
    }

    // Test 2: C++ Compilation
    console.log('🔨 Test 2: Compiling C++ with mounted volume...');
    const compileCmd = `docker run --rm -v='${dockerPath}:/sandbox' -w=/sandbox minileetcode-runner-gcc:latest sh -c "cd /sandbox && ls -la && g++ -O2 solution.cpp -o main.out && ls -la main.out"`;
    console.log(`Command: ${compileCmd}\n`);

    exec(compileCmd, { shell: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
            console.log('❌ Compilation test FAILED');
            console.log(`Stdout: ${stdout}`);
            console.log(`Stderr: ${stderr}\n`);
            cleanup();
            process.exit(1);
        }

        if (stdout.includes('main.out')) {
            console.log('✓ Compilation test PASSED\n');
        } else {
            console.log('❌ Binary not created');
            console.log(`Output: ${stdout}\n`);
            cleanup();
            process.exit(1);
        }

        // Test 3: Execution
        console.log('▶️ Test 3: Executing compiled binary...');
        const inputFile = path.join(testDir, 'input.txt');
        fs.writeFileSync(inputFile, '12 5', 'utf-8');
        
        const execCmd = `docker run --rm -v='${dockerPath}:/sandbox' -w=/sandbox minileetcode-runner-gcc:latest sh -c "cat /sandbox/input.txt | /sandbox/main.out"`;
        console.log(`Command: ${execCmd}\n`);

        exec(execCmd, { shell: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                console.log('❌ Execution test FAILED');
                console.log(`Stderr: ${stderr}\n`);
                cleanup();
                process.exit(1);
            }

            const result = stdout.trim();
            if (result === '17') {
                console.log(`✓ Execution test PASSED`);
                console.log(`  Input: 12 5`);
                console.log(`  Output: ${result}\n`);
                console.log('✅ ALL TESTS PASSED - Docker volume mount and C++ compilation working!\n');
            } else {
                console.log(`❌ Execution test failed - wrong output`);
                console.log(`  Expected: 17`);
                console.log(`  Got: ${result}\n`);
            }

            cleanup();
        });
    });
});

function cleanup() {
    try {
        fs.rmSync(testDir, { recursive: true, force: true });
        console.log('🧹 Cleaned up test directory');
    } catch (e) {}
}
