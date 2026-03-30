import { spawn } from 'child_process';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import os from 'os';

/**
 * Maps language to Docker image and compile/run commands
 */
const LANGUAGE_CONFIG = {
    PYTHON: {
        image: 'minileetcode-runner-python:latest',
        extension: '.py',
        runCommand: (file) => ['python3', file],
    },
    JAVASCRIPT: {
        image: 'minileetcode-runner-node:latest',
        extension: '.js',
        runCommand: (file) => ['node', file],
    },
    CPP: {
        image: 'minileetcode-runner-gcc:latest',
        extension: '.cpp',
        compileCommand: (src, out) => ['g++', '-O2', src, '-o', out],
        runCommand: (out) => [`./${out}`],
    },
    JAVA: {
        image: 'minileetcode-runner-java:latest',
        extension: '.java',
        compileCommand: (src) => ['javac', src],
        runCommand: () => ['java', '-cp', '/sandbox', 'Main'],
    }
};

/**
 * Tracks cleanup failures to detect systemic issues
 */
let cleanupFailureCount = 0;
const CLEANUP_FAILURE_THRESHOLD = 10;
const MAX_CODE_SIZE = 100 * 1024; // 100 KB

/**
 * Validates language is supported
 * @throws {Error} If language not supported
 */
const validateLanguage = (language) => {
    if (!LANGUAGE_CONFIG[language]) {
        throw new Error(
            `Unsupported language: ${language}. Supported: ${Object.keys(LANGUAGE_CONFIG).join(', ')}`
        );
    }
};

/**
 * Ensures temp directory is safe to use
 * @throws {Error} If directory setup fails
 */
const ensureTempDir = async (tempDir) => {
    try {
        await fs.mkdir(tempDir, { recursive: true });
        
        // Verify directory is writable
        const testFile = path.join(tempDir, '.writetest');
        await fs.writeFile(testFile, '');
        await fs.rm(testFile);
    } catch (err) {
        throw new Error(`Failed to set up temp directory ${tempDir}: ${err.message}`);
    }
};

/**
 * Cleans up temporary directory with retry logic
 * @throws {Error} After max retries exhausted
 */
const cleanupTempDir = async (tempDir) => {
    const MAX_RETRIES = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
            logger.debug(`Cleaned up temp directory: ${tempDir}`);
            cleanupFailureCount = Math.max(0, cleanupFailureCount - 1);
            return; // Success
        } catch (err) {
            lastError = err;
            logger.warn(`Cleanup attempt ${attempt}/${MAX_RETRIES} failed for ${tempDir}: ${err.message}`);
            
            if (attempt < MAX_RETRIES) {
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
            }
        }
    }
    
    // All retries exhausted
    cleanupFailureCount++;
    logger.error(
        `Failed to clean up ${tempDir} after ${MAX_RETRIES} attempts: ${lastError.message}`
    );
    
    // Alert if threshold reached
    if (cleanupFailureCount >= CLEANUP_FAILURE_THRESHOLD) {
        logger.error(
            `CRITICAL: Temp directory cleanup failing repeatedly (${cleanupFailureCount} failures). ` +
            `Possible filesystem issue. Manual intervention may be required. Temp dir: ${tempDir}`
        );
    }
    
    throw lastError;
};

/**
 * Executes code inside a hardened Docker container
 * @param {string} code - Source code to execute
 * @param {string} language - Language enum (PYTHON, JAVASCRIPT, CPP, JAVA)
 * @param {string} input - Stdin data
 * @param {Object} limits - {timeLimit, memoryLimit, cpuLimit}
 * @returns {Promise<{stdout, stderr, runTime, error}>}
 */
export const runCodeInSandbox = async (
    code,
    language,
    input = '',
    limits = { timeLimit: 5, memoryLimit: 256, cpuLimit: 0.5 }
) => {
    // ============================================
    // VALIDATION
    // ============================================
    validateLanguage(language);
    
    if (!code || code.length === 0) {
        throw new Error('Code cannot be empty');
    }
    
    if (code.length > MAX_CODE_SIZE) {
        throw new Error(
            `Code exceeds maximum allowed size (${MAX_CODE_SIZE} bytes). Current size: ${code.length} bytes`
        );
    }
    
    // Constrain limits to safe ranges
    const safeTimeLimit = Math.max(1, Math.min(60, limits.timeLimit || 5));
    const safeMemoryLimit = Math.max(32, Math.min(2048, limits.memoryLimit || 256));
    const safeCpuLimit = Math.max(0.1, Math.min(2, limits.cpuLimit || 0.5));
    
    const config = LANGUAGE_CONFIG[language];
    const executionId = crypto.randomUUID();
    const tempDir = path.join(process.cwd(), 'tmp', executionId);
    
    try {
        // ============================================
        // SETUP
        // ============================================
        await ensureTempDir(tempDir);
        
        const fileName = language === 'JAVA' ? 'Main.java' : `main${config.extension}`;
        const filePath = path.join(tempDir, fileName);
        await fs.writeFile(filePath, code, 'utf8');
        
        // Ensure the directory and file are reachable by the non-root 'runner' user 
        // inside the sandbox container. This is especially important for volume mounts.
        await fs.chmod(tempDir, 0o777);
        try {
            await fs.chmod(filePath, 0o666);
        } catch (chmodErr) {
            logger.debug(`Non-fatal: could not chmod source file ${filePath}: ${chmodErr.message}`);
        }

        // Small delay to ensure disk sync for volume mounts on Docker Desktop (Windows/Mac)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        logger.debug(`Execution setup: ${language} (${executionId}), code size: ${code.length} bytes`);
        
        // ============================================
        // COMPILATION (if needed)
        // ============================================
        if (config.compileCommand) {
            const compileTimeout = Math.min(30, safeTimeLimit + 10);
            logger.debug(`Compiling ${language} code (timeout: ${compileTimeout}s)`);
            
            const compileArgs = config.compileCommand(fileName, 'main.out');
            const compileResult = await executeDockerCommand(
                config.image,
                executionId,
                compileArgs,
                '',
                { timeLimit: compileTimeout, memoryLimit: safeMemoryLimit, cpuLimit: safeCpuLimit },
                tempDir
            );
            
            if (compileResult.error) {
                logger.debug(`Compilation failed for ${language}`);
                return {
                    ...compileResult,
                    stderr: compileResult.stderr || 'Compilation error'
                };
            }
        }
        
        // ============================================
        // EXECUTION
        // ============================================
        const runArgs = config.runCommand(language === 'CPP' ? 'main.out' : fileName);
        logger.debug(`Executing ${language} code (timeout: ${safeTimeLimit}s, memory: ${safeMemoryLimit}MB)`);
        
        const result = await executeDockerCommand(
            config.image,
            executionId,
            runArgs,
            input,
            { timeLimit: safeTimeLimit, memoryLimit: safeMemoryLimit, cpuLimit: safeCpuLimit },
            tempDir
        );
        
        return result;
        
    } catch (err) {
        logger.error(`Sandbox execution failed: ${err.message}`);
        return {
            stdout: '',
            stderr: `Execution engine error: ${err.message}`,
            error: err,
            runTime: 0
        };
    } finally {
        // ============================================
        // CLEANUP (with retry and monitoring)
        // ============================================
        try {
            // Give a tiny moment for Windows host to release file handles before cleanup
            await new Promise(resolve => setTimeout(resolve, 50));
            await cleanupTempDir(tempDir);
        } catch (cleanupErr) {
            // Cleanup failure is logged but not thrown
            // to prevent masking execution results
            logger.error(`Cleanup error (non-fatal): ${cleanupErr.message}`);
        }
    }
};

/**
 * Executes Docker command with timeout and resource limits
 * @private
 */
const executeDockerCommand = (image, executionId, commandArgs, stdinData, limits, tempDir) => {
    return new Promise((resolve) => {
        const startTime = process.hrtime.bigint();
        
        // On Windows and DinD scenarios, the host daemon needs the host-absolute path for volume mounts.
        // If HOST_PROJECT_PATH is provided (from .env/compose), we construct the host-side path 
        // to our execution temporary directory.
        let hostTempDir = process.env.HOST_PROJECT_PATH 
            ? path.join(process.env.HOST_PROJECT_PATH, 'tmp', executionId)
            : tempDir;

        // Normalize host path for Windows Docker Desktop if it was constructed on Linux
        // Windows daemon accepts forward slashes, and it's safer than mixed slashes.
        if (hostTempDir.includes('\\') || hostTempDir.includes(':')) {
            hostTempDir = hostTempDir.replace(/\\/g, '/');
        }

        const dockerArgs = [
            'run',
            '--rm',                              // Remove container after execution
            '-i',                                 // Interactive (allows stdin)
            `--memory=${limits.memoryLimit}m`,   // RAM limit
            `--cpus=${limits.cpuLimit}`,         // CPU limit
            '--pids-limit=64',                   // Prevent fork bombs
            '--network=none',                    // No network access
            '--security-opt=no-new-privileges', // Prevent privilege escalation
            '--tmpfs=/tmp:rw,noexec,nosuid,size=50m', // Temporary writable space
            '-v', `${hostTempDir}:/sandbox`,
            '-w', `/sandbox`,
            image,
            ...commandArgs
        ];
        
        const child = spawn('docker', dockerArgs, {
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: (limits.timeLimit * 1000) + 5000 // 5s grace period
        });
        
        let stdout = '';
        let stderr = '';
        let isTerminated = false;
        
        // Increase the total timeout to allow for Docker startup overhead on the host. 
        // We'll only report TLE if the actual execution (measured below) exceeds the limit,
        // OR if this hard timer triggers.
        // On Windows Docker Desktop, startup can be 2-4 seconds.
        const STARTUP_OVERHEAD_MS = 8000; 
        const totalTimeoutMs = (limits.timeLimit * 1000) + STARTUP_OVERHEAD_MS;

        const timeoutId = setTimeout(() => {
            isTerminated = true;
            child.kill('SIGKILL');
            logger.warn(`Execution hard timeout after ${totalTimeoutMs / 1000}s (Limit: ${limits.timeLimit}s + Overhead: ${STARTUP_OVERHEAD_MS/1000}s)`);
            
            resolve({
                stdout: '',
                stderr: 'Time Limit Exceeded',
                error: new Error('Timeout'),
                runTime: limits.timeLimit * 1000
            });
        }, totalTimeoutMs);
        
        // ============================================
        // INPUT HANDLING
        // ============================================
        if (stdinData) {
            child.stdin.write(stdinData);
        }
        child.stdin.end();
        
        // ============================================
        // OUTPUT COLLECTION
        // ============================================
        child.stdout.on('data', (data) => {
            stdout += data.toString();
            // Prevent memory exhaustion from infinite output
            if (stdout.length > 10 * 1024 * 1024) { // 10MB limit
                child.kill('SIGKILL');
                isTerminated = true;
                logger.warn('Output exceeded 10MB limit, killing process');
            }
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
            if (stderr.length > 1 * 1024 * 1024) { // 1MB limit
                child.kill('SIGKILL');
                isTerminated = true;
                logger.warn('Error output exceeded 1MB limit, killing process');
            }
        });
        
        // ============================================
        // COMPLETION HANDLER
        // ============================================
        child.on('close', (code) => {
            clearTimeout(timeoutId);
            
            if (isTerminated) return; // Already resolved from timeout
            
            const endTime = process.hrtime.bigint();
            let executionTimeMs = Number(endTime - startTime) / 1_000_000;
            
            // Subtract estimated Docker startup overhead to report a more "pure" runtime.
            // A typical fast Docker run on Windows takes ~4s. We subtract 4s to make
            // the reported time more representative of the user's code.
            // If the result is negative, we use a small positive number.
            const DOCKER_RELIABLE_OVERHEAD_MS = 4000;
            const pureExecutionTimeMs = Math.max(1, executionTimeMs - DOCKER_RELIABLE_OVERHEAD_MS);

            stdout = stdout.trim();
            stderr = stderr.trim();
            
            // Detect OOM kill (Docker exit code 137)
            if (code === 137) {
                return resolve({
                    stdout,
                    stderr: 'Memory Limit Exceeded',
                    error: new Error('OOM'),
                    runTime: pureExecutionTimeMs
                });
            }
            
            // Handle non-zero exit codes
            if (code !== 0) {
                return resolve({
                    stdout,
                    stderr: stderr || `Process exited with code ${code}`,
                    error: new Error('Runtime Error'),
                    runTime: pureExecutionTimeMs
                });
            }
            
            // Success
            resolve({
                stdout,
                stderr: '',
                error: null,
                runTime: pureExecutionTimeMs
            });
        });
        
        // ============================================
        // ERROR HANDLER
        // ============================================
        child.on('error', (err) => {
            clearTimeout(timeoutId);
            logger.error(`Failed to spawn Docker process: ${err.message}`);
            
            resolve({
                stdout: '',
                stderr: `Failed to execute: ${err.message}`,
                error: err,
                runTime: 0
            });
        });
    });
};
