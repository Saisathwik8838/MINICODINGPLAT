import { exec } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { performance } from 'perf_hooks';
import { logger } from './logger.js';
import { env } from '../config/env.js';

const LANGUAGE_CONFIGS = {
    PYTHON: {
        image: 'minileetcode-runner-python:latest',
        fileName: 'solution.py',
        compileCommand: null,
        runCommand: (out) => ['python3', 'solution.py'],
        timeout: 10,
        memory: '128m',
        user: 'runner'
    },
    NODEJS: {
        image: 'minileetcode-runner-node:latest',
        fileName: 'solution.js',
        compileCommand: null,
        runCommand: (out) => ['node', 'solution.js'],
        timeout: 10,
        memory: '128m',
        user: 'node'
    },
    CPP: {
        image: 'minileetcode-runner-gcc:latest',
        fileName: 'solution.cpp',
        compileCommand: (file, out) => `g++ -O2 ${file} -o ${out}`,
        runCommand: (out) => [`./${out}`],
        timeout: 8,
        memory: '64m',
        user: 'runner'
    },
    JAVA: {
        image: 'minileetcode-runner-java:latest',
        fileName: 'Main.java',
        compileCommand: (file) => `javac ${file}`,
        runCommand: () => ['java', '-cp', '/sandbox', 'Main'],
        timeout: 12,
        memory: '256m',
        user: 'runner'
    }
};

/**
 * Resolves the host-side temporary directory path.
 */
const resolveHostTempDir = (executionId) => {
    const hostProjectPath = process.env.HOST_PROJECT_PATH;
    
    if (!hostProjectPath) {
        logger.warn('HOST_PROJECT_PATH not set in .env. Falling back to local path.');
        return path.resolve(process.cwd(), 'tmp', executionId);
    }

    const normalizedHostPath = hostProjectPath.replace(/\\/g, '/').replace(/\/$/, '');
    return `${normalizedHostPath}/tmp/${executionId}`;
};

/**
 * Executes a command inside a Docker container
 */
const executeDockerCommand = async (config, executionId, hostPath) => {
    const uniqueContainerName = `sandbox-${executionId}`;
    
    const dockerArgs = [
        'run',
        '--rm',
        '--network none',
        '--security-opt=no-new-privileges:true',
        '--pids-limit', '64',
        `--memory=${config.memory}`,
        '--cpus=0.5',
        `--name=${uniqueContainerName}`,
        `-v=${hostPath}:/sandbox`,
        '-w=/sandbox',
        `--user=${config.user}`,
        config.image
    ];

    const commandToRun = config.runCommand('main.out').join(' ');
    const fullDockerCmd = `docker ${dockerArgs.join(' ')} sh -c "${commandToRun} < input.txt"`;

    return new Promise((resolve) => {
        const startTime = performance.now();
        // Use a longer timeout for the overall process to account for Docker startup lag
        const processTimeout = (config.timeout + 5) * 1000; 

        const timeoutId = setTimeout(() => {
            logger.warn(`Execution ${executionId} timed out after ${processTimeout}ms`);
            exec(`docker kill ${uniqueContainerName}`).catch(() => {});
            resolve({
                status: 'TIMEOUT',
                stdout: '',
                stderr: 'Time Limit Exceeded',
                runTime: config.timeout * 1000
            });
        }, processTimeout);

        exec(fullDockerCmd, (error, stdout, stderr) => {
            clearTimeout(timeoutId);
            const endTime = performance.now();
            const runTime = endTime - startTime;

            if (error) {
                if (error.killed || error.signal === 'SIGTERM' || error.signal === 'SIGKILL') {
                    return resolve({
                        status: 'TIMEOUT',
                        stdout: stdout.trim(),
                        stderr: 'Time Limit Exceeded',
                        runTime: Math.max(runTime, config.timeout * 1000)
                    });
                }
                
                // If the exit code is non-zero, it's a runtime error
                return resolve({
                    status: 'RUNTIME_ERROR',
                    stdout: stdout.trim(),
                    stderr: stderr.trim() || error.message,
                    runTime
                });
            }

            resolve({
                status: 'SUCCESS',
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                runTime
            });
        });
    });
};

/**
 * Compiles and runs user code in a containerized sandbox
 */
export const runCodeInSandbox = async (language, code, input) => {
    const config = LANGUAGE_CONFIGS[language.toUpperCase()];
    if (!config) throw new Error(`Unsupported language: ${language}`);

    const executionId = uuidv4();
    const containerTempDir = path.join(process.cwd(), 'tmp', executionId);
    
    try {
        await fs.ensureDir(containerTempDir);
        
        const codeFile = path.join(containerTempDir, config.fileName);
        const inputFile = path.join(containerTempDir, 'input.txt');
        
        await fs.writeFile(codeFile, code);
        await fs.writeFile(inputFile, input || '');

        // Permissions for container 'runner' user
        await fs.chmod(containerTempDir, 0o777);
        await fs.chmod(codeFile, 0o666);
        await fs.chmod(inputFile, 0o666);

        // Windows Host Sync Delay
        if (process.platform === 'win32' || process.env.HOST_PROJECT_PATH) {
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        const hostPath = resolveHostTempDir(executionId);

        // Compilation Step
        if (config.compileCommand) {
            const compileCmd = config.compileCommand(config.fileName, 'main.out');
            
            const compileResult = await new Promise((resolve) => {
                const cmd = `docker run --rm -v="${hostPath}:/sandbox" -w=/sandbox ${config.image} sh -c "${compileCmd}"`;
                exec(cmd, (error, stdout, stderr) => {
                    if (error) {
                        resolve({ success: false, error: stderr.trim() || stdout.trim() || error.message });
                    } else {
                        resolve({ success: true });
                    }
                });
            });

            if (!compileResult.success) {
                return {
                    status: 'COMPILATION_ERROR',
                    stdout: '',
                    stderr: compileResult.error,
                    runTime: 0
                };
            }
        }

        // Execution Step
        return await executeDockerCommand(config, executionId, hostPath);

    } catch (err) {
        logger.error(`Sandbox Internal Error [${executionId}]:`, err);
        return {
            status: 'INTERNAL_ERROR',
            stdout: '',
            stderr: err.message,
            runTime: 0
        };
    } finally {
        // Cleanup temp files
        if (env.NODE_ENV === 'production') {
            await fs.remove(containerTempDir).catch(e => logger.warn(`Cleanup failed: ${e.message}`));
        }
    }
};
