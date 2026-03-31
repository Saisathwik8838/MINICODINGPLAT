import { exec, execSync } from 'child_process';
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
 * Validates that Docker is available and running
 */
const validateDockerAvailable = async () => {
    return new Promise((resolve) => {
        exec('docker --version', (error) => {
            if (error) {
                logger.error('Docker is not available', { error: error.message });
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
};

/**
 * Validates that a Docker image exists
 */
const validateImageExists = async (imageName) => {
    return new Promise((resolve) => {
        exec(`docker image inspect ${imageName}`, (error) => {
            if (error) {
                logger.warn(`Docker image not found: ${imageName}`);
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
};

/**
 * Gets the host-side temporary directory path for cross-platform compatibility
 */
const getHostTempDir = (executionId) => {
    let hostProjectPath = process.env.HOST_PROJECT_PATH || process.cwd();
    
    // Ensure we have an absolute path
    if (!path.isAbsolute(hostProjectPath)) {
        hostProjectPath = path.resolve(process.cwd(), hostProjectPath);
        logger.debug(`Converted relative path to absolute: ${hostProjectPath}`);
    }
    
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
        // For Windows Docker Desktop: convert C:\ to /c/ format (NOT /mnt/c/)
        const normalized = hostProjectPath
            .replace(/\\/g, '/')
            .replace(/^([A-Z]):/, (match, drive) => `/${drive.toLowerCase()}`)
            .replace(/\/$/, '');
        logger.debug(`Windows Docker path: ${normalized}/tmp/${executionId}`);
        return `${normalized}/tmp/${executionId}`;
    } else {
        // For Linux/Mac: use the absolute path directly
        const normalized = hostProjectPath.replace(/\/$/, '');
        logger.debug(`Unix Docker path: ${normalized}/tmp/${executionId}`);
        return `${normalized}/tmp/${executionId}`;
    }
};

/**
 * Properly escape shell arguments for docker commands
 */
const escapeShellArg = (arg) => {
    if (process.platform === 'win32') {
        // Windows: use double quotes and escape special chars
        return `"${arg.replace(/"/g, '\\"').replace(/\$/g, '$$$')}"`;
    } else {
        // Unix: use single quotes where possible
        return `'${arg.replace(/'/g, "'\\''")}'`;
    }
};

/**
 * Executes code inside a Docker container with proper error handling
 */
const executeDockerCommand = async (config, executionId, containerPath) => {
    const uniqueContainerName = `sandbox-${executionId.substring(0, 12)}`;
    
    logger.debug(`Starting execution: ${executionId}`, {
        language: config.image,
        container: uniqueContainerName,
        timeout: config.timeout
    });

    return new Promise((resolve) => {
        // Construct docker run command with all security options
        const dockerArgs = [
            'run',
            '--rm',
            '--network', 'none',
            '--security-opt=no-new-privileges:true',
            '--pids-limit', '64',
            `--memory=${config.memory}`,
            '--cpus=0.5',
            `--name=${uniqueContainerName}`,
            `-v=${containerPath}:/sandbox`,
            '-w=/sandbox',
            `--user=${config.user}`,
            config.image
        ];

        // Build the command to run inside container
        const runCmd = config.runCommand('main.out').join(' ');
        // Use cat + pipe approach instead of shell redirection for better reliability
        const fullCmd = `cat input.txt | ${runCmd}`;
        
        // IMPORTANT: Properly quote the shell command
        const fullDockerCmd = `docker ${dockerArgs.join(' ')} sh -c "${fullCmd}"`;
        
        logger.debug(`Executing docker command for ${executionId}`, { cmd: fullDockerCmd.substring(0, 200) });

        const startTime = performance.now();
        const timeoutMs = (config.timeout + 5) * 1000; // 5s buffer for Docker startup
        let completed = false;

        const timeoutId = setTimeout(() => {
            if (!completed) {
                logger.warn(`Execution timeout: ${executionId}`, { timeout: timeoutMs });
                completed = true;
                
                // Attempt to kill the container
                exec(`docker kill ${uniqueContainerName}`, (err) => {
                    if (err) logger.debug(`Failed to kill container ${uniqueContainerName}`);
                });

                resolve({
                    status: 'TIMEOUT',
                    stdout: '',
                    stderr: 'Time Limit Exceeded',
                    runTime: config.timeout * 1000,
                    executionId
                });
            }
        }, timeoutMs);

        exec(fullDockerCmd, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            clearTimeout(timeoutId);
            
            if (completed) return;
            completed = true;

            const endTime = performance.now();
            const runTime = endTime - startTime;

            logger.debug(`Execution completed: ${executionId}`, { 
                status: error ? 'failed' : 'success',
                runtime: runTime,
                outputSize: stdout.length
            });

            if (error) {
                // Check if it was killed/timeout
                if (error.killed || error.signal === 'SIGTERM' || error.signal === 'SIGKILL') {
                    logger.info(`Execution killed/timeout: ${executionId}`);
                    return resolve({
                        status: 'TIMEOUT',
                        stdout: stdout.trim(),
                        stderr: 'Time Limit Exceeded',
                        runTime: Math.max(runTime, config.timeout * 1000),
                        executionId
                    });
                }

                // Non-zero exit code = runtime error
                logger.warn(`Execution runtime error: ${executionId}`, { 
                    exitCode: error.code,
                    signal: error.signal 
                });
                
                return resolve({
                    status: 'RUNTIME_ERROR',
                    stdout: stdout.trim(),
                    stderr: (stderr || error.message).trim(),
                    runTime,
                    executionId
                });
            }

            // Success
            resolve({
                status: 'SUCCESS',
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                runTime,
                executionId
            });
        });
    });
};

/**
 * Compiles code in Docker container (for languages that need compilation)
 */
const compileInSandbox = async (config, containerPath, execId) => {
    if (!config.compileCommand) return { success: true };

    logger.debug(`Compiling code: ${execId}`, { language: config.image });

    return new Promise((resolve) => {
        const compileCmd = config.compileCommand(config.fileName, 'main.out');
        const dockerCmd = `docker run --rm -v="${containerPath}:/sandbox" -w=/sandbox ${config.image} sh -c "${compileCmd}"`;
        
        logger.debug(`Compile command: ${dockerCmd.substring(0, 150)}`);

        exec(dockerCmd, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                logger.warn(`Compilation failed: ${execId}`, { 
                    language: config.image,
                    error: (stderr || error.message).substring(0, 200)
                });
                resolve({ 
                    success: false, 
                    error: (stderr || stdout || error.message).trim() 
                });
            } else {
                logger.debug(`Compilation succeeded: ${execId}`);
                resolve({ success: true });
            }
        });
    });
};

/**
 * Main function: Compile and run user code in containerized sandbox
 */
export const runCodeInSandbox = async (language, code, input) => {
    const config = LANGUAGE_CONFIGS[language.toUpperCase()];
    if (!config) {
        const error = `Unsupported language: ${language}`;
        logger.error(error);
        return {
            status: 'INTERNAL_ERROR',
            stdout: '',
            stderr: error,
            runTime: 0,
            executionId: 'unknown'
        };
    }

    const executionId = uuidv4();
    const localTempDir = path.join(process.cwd(), 'tmp', executionId);

    logger.info(`Starting code execution: ${executionId}`, { 
        language,
        codeSize: code.length,
        inputSize: input ? input.length : 0
    });

    try {
        // Step 1: Validate Docker is available
        const dockerAvailable = await validateDockerAvailable();
        if (!dockerAvailable) {
            return {
                status: 'INTERNAL_ERROR',
                stdout: '',
                stderr: 'Docker daemon is not running or not available',
                runTime: 0,
                executionId
            };
        }

        // Step 2: Validate image exists
        const imageExists = await validateImageExists(config.image);
        if (!imageExists) {
            logger.error(`Docker image not found: ${config.image}`);
            return {
                status: 'INTERNAL_ERROR',
                stdout: '',
                stderr: `Sandbox image not available: ${config.image}. Please rebuild executor images.`,
                runTime: 0,
                executionId
            };
        }

        // Step 3: Create temporary directory
        await fs.ensureDir(localTempDir);
        logger.debug(`Created temp directory: ${localTempDir}`);

        // Step 4: Write files
        const codeFilePath = path.join(localTempDir, config.fileName);
        const inputFilePath = path.join(localTempDir, 'input.txt');

        await fs.writeFile(codeFilePath, code, 'utf8');
        await fs.writeFile(inputFilePath, input || '', 'utf8');
        
        logger.debug(`Wrote code and input files`, { 
            codeFile: config.fileName,
            inputSize: input ? input.length : 0
        });

        // Step 5: Set permissive permissions for container user
        await fs.chmod(localTempDir, 0o777);
        await fs.chmod(codeFilePath, 0o666);
        await fs.chmod(inputFilePath, 0o666);

        // Step 6: Windows Docker Desktop sync delay (if needed)
        if (process.platform === 'win32' || process.env.HOST_PROJECT_PATH) {
            logger.debug(`Windows Docker Desktop detected, adding sync delay`);
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Step 7: Get container path for volume mount
        const containerTempDir = getHostTempDir(executionId);
        logger.debug(`Using container path: ${containerTempDir}`);

        // Step 8: Compile if needed
        if (config.compileCommand) {
            const compileResult = await compileInSandbox(config, containerTempDir, executionId);
            if (!compileResult.success) {
                logger.info(`Compilation error for ${executionId}`);
                return {
                    status: 'COMPILATION_ERROR',
                    stdout: '',
                    stderr: compileResult.error,
                    runTime: 0,
                    executionId
                };
            }
        }

        // Step 9: Execute code
        logger.debug(`Ready to execute code in ${config.image}`);
        const result = await executeDockerCommand(config, executionId, containerTempDir);
        
        logger.info(`Execution completed: ${executionId}`, { 
            status: result.status,
            runtime: result.runTime,
            outputLength: result.stdout.length
        });

        return result;

    } catch (err) {
        const errorMsg = err.message || String(err);
        logger.error(`Sandbox internal error: ${executionId}`, { 
            error: errorMsg,
            stack: err.stack 
        });

        return {
            status: 'INTERNAL_ERROR',
            stdout: '',
            stderr: `Sandbox execution error: ${errorMsg}`,
            runTime: 0,
            executionId
        };

    } finally {
        // Step 10: Cleanup temp files
        try {
            if (env.NODE_ENV === 'production' || process.env.CLEANUP_ENABLED === 'true') {
                await fs.remove(localTempDir);
                logger.debug(`Cleaned up: ${localTempDir}`);
            } else {
                logger.debug(`Kept temp directory for debugging: ${localTempDir}`);
            }
        } catch (cleanupErr) {
            logger.warn(`Failed to cleanup ${localTempDir}`, { error: cleanupErr.message });
        }
    }
};
