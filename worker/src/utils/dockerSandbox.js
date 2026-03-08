import { spawn } from 'child_process';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

/**
 * Maps the platform language enum to the specific Docker image
 */
const LANGUAGE_CONFIG = {
    PYTHON: {
        image: 'minileetcode-runner-python',
        extension: '.py',
        runCommand: (file) => ['python3', file],
    },
    JAVASCRIPT: {
        image: 'minileetcode-runner-node',
        extension: '.js',
        runCommand: (file) => ['node', file],
    },
    CPP: {
        image: 'minileetcode-runner-gcc', // Can use alpine later for size
        extension: '.cpp',
        compileCommand: (src, out) => ['g++', '-O2', src, '-o', out],
        runCommand: (out) => [`./${out}`],
    },
    JAVA: {
        image: 'openjdk:17-alpine',
        extension: '.java',
        // In Java, the file name MUST match the public class name. We will enforce Main.java
        compileCommand: (src) => ['javac', src],
        runCommand: () => ['java', 'Main'],
    }
};

/**
 * Execute code inside a hardened Docker container
 * 
 * @param {string} code - The source code to execute
 * @param {string} language - The language enum (PYTHON, JAVASCRIPT, CPP, JAVA)
 * @param {string} input - Provide to stdin
 * @param {object} limits - Memory and API limits
 * @returns {Promise<{ stdout: string, stderr: string, error: Error, runTime: number }>}
 */
export const runCodeInSandbox = async (code, language, input = '', limits = { timeLimit: 5, memoryLimit: 256 }) => {
    const config = LANGUAGE_CONFIG[language];
    if (!config) throw new Error(`Unsupported language: ${language}`);

    // Create a unique temporary directory for this execution
    const executionId = crypto.randomUUID();
    const tempDir = path.join(process.cwd(), 'tmp', executionId);
    await fs.mkdir(tempDir, { recursive: true });

    const fileName = language === 'JAVA' ? 'Main.java' : `main${config.extension}`;
    const filePath = path.join(tempDir, fileName);
    await fs.writeFile(filePath, code);

    try {
        // Stage 1: Compilation (If needed)
        if (config.compileCommand) {
            const compileArgs = config.compileCommand(fileName, 'main.out');
            await executeDockerCommand(config.image, tempDir, compileArgs, '', limits);
        }

        // Stage 2: Execution
        const runArgs = config.runCommand(language === 'CPP' ? 'main.out' : fileName);
        const result = await executeDockerCommand(config.image, tempDir, runArgs, input, limits);

        return result;

    } finally {
        // Always clean up the temp directory after execution
        await fs.rm(tempDir, { recursive: true, force: true }).catch((err) => {
            logger.error(`Failed to clean up temp dir ${tempDir}:`, err);
        });
    }
};

/**
 * Core function to run a Docker container with Hardened Security
 */
const executeDockerCommand = (image, volumePath, commandArgs, stdinData, limits) => {
    return new Promise((resolve) => {
        const startTime = process.hrtime();

        const dockerArgs = [
            'run',
            '--rm',                     // Remove container after execution
            '-i',                       // Interactive (allows piping stdin)
            `--memory=${limits.memoryLimit}m`,  // RAM limit
            `--cpus=0.5`,               // CPU limit
            `--pids-limit=64`,          // Prevent fork bombs
            '--network=none',           // No internet access
            '--security-opt=no-new-privileges', // Prevent privilege escalation
            '--read-only',              // Root FS is read-only
            `-v`, `${volumePath}:/usr/src/app`, // Mount code directory
            '-w', '/usr/src/app',       // Set working dir
            image,
            ...commandArgs
        ];

        const child = spawn('docker', dockerArgs);

        let stdout = '';
        let stderr = '';
        let isTerminated = false;

        // Timeout mechanism (failsafe independent of language runner)
        const timeoutId = setTimeout(() => {
            isTerminated = true;
            child.kill('SIGKILL');
            resolve({
                stdout: '',
                stderr: 'Time Limit Exceeded',
                error: new Error('Timeout'),
                runTime: limits.timeLimit * 1000
            });
        }, limits.timeLimit * 1000 + 500); // 500ms grace period overhead

        // Write input to stdin
        if (stdinData) {
            child.stdin.write(stdinData);
        }
        child.stdin.end(); // Always close stdin so child process doesn't hang waiting for input

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            clearTimeout(timeoutId);

            if (isTerminated) return; // Promise already resolved from timeout

            const endTime = process.hrtime(startTime);
            const executionTimeMs = (endTime[0] * 1000) + (endTime[1] / 1000000);

            // Normalize outputs (trim whitespace)
            stdout = stdout.trim();
            stderr = stderr.trim();

            if (code !== 0) {
                // Did it fail due to OOM kill? Docker natively kills with 137 exit code
                if (code === 137) {
                    return resolve({
                        stdout,
                        stderr: 'Memory Limit Exceeded',
                        error: new Error('OOM'),
                        runTime: executionTimeMs
                    });
                }

                return resolve({
                    stdout,
                    stderr: stderr || `Process exited with code ${code}`,
                    error: new Error('Runtime Error'),
                    runTime: executionTimeMs
                });
            }

            resolve({
                stdout,
                stderr: '',
                error: null,
                runTime: executionTimeMs
            });
        });

        child.on('error', (err) => {
            clearTimeout(timeoutId);
            logger.error('Failed to spawn docker process', err);
            resolve({
                stdout: '',
                stderr: 'Internal Execution Engine Error',
                error: err,
                runTime: 0
            });
        });
    });
};
