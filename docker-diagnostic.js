#!/usr/bin/env node
/**
 * Docker Sandbox Diagnostic Tool
 * Checks all aspects of Docker setup for code execution issues
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(msg, type = 'info') {
    const prefix = {
        'info': `${colors.blue}[INFO]${colors.reset}`,
        'success': `${colors.green}[✓]${colors.reset}`,
        'error': `${colors.red}[✗]${colors.reset}`,
        'warn': `${colors.yellow}[!]${colors.reset}`,
    };
    console.log(`${prefix[type]} ${msg}`);
}

function runCmd(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf-8' }).trim();
    } catch (e) {
        return null;
    }
}

async function main() {
    console.log(`\n${colors.bold}═══════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}  Docker Sandbox Diagnostic Tool${colors.reset}`);
    console.log(`${colors.bold}═══════════════════════════════════════════${colors.reset}\n`);

    // 1. Check Docker installation
    log('Checking Docker installation...', 'info');
    const dockerVersion = runCmd('docker --version');
    if (dockerVersion) {
        log(`Docker installed: ${dockerVersion}`, 'success');
    } else {
        log('Docker not found!', 'error');
        process.exit(1);
    }

    // 2. Check Docker daemon
    log('Checking Docker daemon...', 'info');
    const dockerInfo = runCmd('docker info');
    if (dockerInfo) {
        log('Docker daemon running', 'success');
    } else {
        log('Docker daemon is NOT running!', 'error');
        return;
    }

    // 3. Check containers
    log('Checking containers...', 'info');
    const containers = runCmd('docker ps --format "{{.Names}}"').split('\n').filter(Boolean);
    const minileetcodeContainers = containers.filter(c => c.includes('minileetcode'));
    
    if (minileetcodeContainers.length > 0) {
        log(`Found ${minileetcodeContainers.length} MiniLeetCode containers:`, 'success');
        minileetcodeContainers.forEach(c => {
            const status = runCmd(`docker inspect -f '{{.State.Status}}' ${c}`);
            console.log(`  - ${c}: ${status}`);
        });
    } else {
        log('No MiniLeetCode containers found!', 'error');
    }

    // 4. Check executor images
    log('Checking executor images...', 'info');
    const images = [
        'minileetcode-runner-python:latest',
        'minileetcode-runner-node:latest',
        'minileetcode-runner-gcc:latest',
        'minileetcode-runner-java:latest'
    ];
    
    for (const img of images) {
        const exists = runCmd(`docker image inspect ${img} 2>/dev/null`) ? true : false;
        if (exists) {
            const size = runCmd(`docker image inspect ${img} --format='{{.VirtualSize}}'`);
            log(`${img}: ${(size / (1024 * 1024)).toFixed(0)}MB`, 'success');
        } else {
            log(`${img}: NOT FOUND!`, 'error');
        }
    }

    // 5. Check temp directory
    const isWindows = process.platform === 'win32';
    const tempDir = path.join(process.cwd(), 'tmp');
    log(`Checking temp directory: ${tempDir}...`, 'info');
    
    if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        log(`Temp directory exists with ${files.length} items`, 'success');
        if (files.length > 0) {
            console.log(`  Sample: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
        }
    } else {
        log('Temp directory does NOT exist!', 'error');
    }

    // 6. Test volume mount
    log('Testing volume mount...', 'info');
    try {
        const testDir = path.join(tempDir, 'docker-test');
        const testFile = path.join(testDir, 'test.txt');
        
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        fs.writeFileSync(testFile, 'test content', 'utf-8');
        fs.chmodSync(testDir, 0o777);
        fs.chmodSync(testFile, 0o666);

        const dockerTestCmd = `docker run --rm -v="${testDir}:/test" alpine:latest sh -c "ls -la /test && cat /test/test.txt && echo 'SUCCESS'"`;
        const result = runCmd(dockerTestCmd);
        
        if (result && result.includes('SUCCESS')) {
            log('Volume mount test PASSED', 'success');
        } else {
            log('Volume mount test FAILED - files not accessible in container', 'error');
            console.log(`  Output: ${result}`);
        }
        
        try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    } catch (e) {
        log(`Volume mount test error: ${e.message}`, 'error');
    }

    // 7. Test file execution
    log('Testing Python execution...', 'info');
    try {
        const testDir = path.join(tempDir, 'python-test');
        const pyFile = path.join(testDir, 'test.py');
        const inputFile = path.join(testDir, 'input.txt');
        
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        fs.writeFileSync(pyFile, 'import sys\ndata = sys.stdin.read()\nprint(f"Read: {data}")', 'utf-8');
        fs.writeFileSync(inputFile, '42', 'utf-8');
        fs.chmodSync(testDir, 0o777);
        fs.chmodSync(pyFile, 0o666);
        fs.chmodSync(inputFile, 0o666);

        const pythonCmd = `docker run --rm -v="${testDir}:/test" minileetcode-runner-python:latest sh -c "cd /test && python3 test.py < input.txt"`;
        const result = runCmd(pythonCmd);
        
        if (result && result.includes('42')) {
            log('Python execution test PASSED', 'success');
        } else {
            log('Python execution test FAILED', 'error');
            console.log(`  Output: ${result || '[no output]'}`);
        }
        
        try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    } catch (e) {
        log(`Python execution test error: ${e.message}`, 'error');
    }

    // 8. Test C++ execution
    log('Testing C++ execution...', 'info');
    try {
        const testDir = path.join(tempDir, 'cpp-test');
        const cppFile = path.join(testDir, 'test.cpp');
        const inputFile = path.join(testDir, 'input.txt');
        
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        fs.writeFileSync(cppFile, '#include <iostream>\nint main() { int x; std::cin >> x; std::cout << x + 1 << std::endl; return 0; }', 'utf-8');
        fs.writeFileSync(inputFile, '41', 'utf-8');
        fs.chmodSync(testDir, 0o777);
        fs.chmodSync(cppFile, 0o666);
        fs.chmodSync(inputFile, 0o666);

        const cppCmd = `docker run --rm -v="${testDir}:/test" minileetcode-runner-gcc:latest sh -c "cd /test && g++ -O2 test.cpp -o test && ./test < input.txt"`;
        const result = runCmd(cppCmd);
        
        if (result && result.includes('42')) {
            log('C++ execution test PASSED', 'success');
        } else {
            log('C++ execution test FAILED', 'error');
            console.log(`  Output: ${result || '[no output]'}`);
        }
        
        try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (e) {}
    } catch (e) {
        log(`C++ execution test error: ${e.message}`, 'error');
    }

    // 9. Check worker logs
    log('Checking worker container logs...', 'info');
    const workerLogs = runCmd('docker logs minileetcode-worker 2>&1 | tail -20');
    if (workerLogs && workerLogs.includes('RUNTIME_ERROR')) {
        log('Worker showing RUNTIME_ERROR - execution is failing!', 'warn');
    } else {
        log('Worker logs normal', 'success');
    }

    // 10. Check database
    log('Checking database...', 'info');
    const dbCheck = runCmd('docker exec minileetcode-postgres pg_isready -U postgres 2>&1');
    if (dbCheck && dbCheck.includes('accepting')) {
        log('Database is ready', 'success');
    } else {
        log('Database check failed', 'error');
    }

    console.log(`\n${colors.bold}═══════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}Diagnostic Complete${colors.reset}\n`);
}

main().catch(err => {
    log(`Fatal error: ${err.message}`, 'error');
    console.error(err);
    process.exit(1);
});
