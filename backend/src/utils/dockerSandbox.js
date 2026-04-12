import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { performance } from 'perf_hooks';
import { logger } from './logger.js';
import { env } from '../config/env.js';

const COMPILATION_FAILURE_EXIT_CODE = 86;
const DOCKER_OUTPUT_MAX_BUFFER = 4 * 1024 * 1024;
const DOCKER_BUILD_MAX_BUFFER = 10 * 1024 * 1024;
const AUTO_BUILD_SANDBOX_IMAGES = process.env.AUTO_BUILD_SANDBOX_IMAGES !== 'false';
const imageBuildPromises = new Map();

const LANGUAGE_CONFIGS = {
    PYTHON: {
        image: 'minileetcode-runner-python:latest',
        fileName: 'solution.py',
        compileCommand: null,
        executeCommand: () => 'cat input.txt | python3 solution.py',
        timeout: 10,
        memory: '128m',
        user: 'runner'
    },
    NODEJS: {
        image: 'minileetcode-runner-node:latest',
        fileName: 'solution.js',
        compileCommand: null,
        executeCommand: () => 'cat input.txt | node solution.js',
        timeout: 10,
        memory: '128m',
        user: 'node'
    },
    CPP: {
        image: 'minileetcode-runner-gcc:latest',
        fileName: 'solution.cpp',
        compileCommand: () => 'g++ -O2 solution.cpp -o main.out',
        executeCommand: () => 'cat input.txt | ./main.out',
        timeout: 8,
        memory: '512m',
        user: 'runner'
    },
    JAVA: {
        image: 'minileetcode-runner-java:latest',
        fileName: 'Main.java',
        compileCommand: () => 'javac Main.java',
        executeCommand: () => 'cat input.txt | java -cp . Main',
        timeout: 12,
        memory: '512m',
        user: 'runner'
    }
};

const SANDBOX_IMAGE_BUILD_SPECS = {
    'minileetcode-runner-python:latest': { dockerfile: 'Dockerfile.python' },
    'minileetcode-runner-node:latest': { dockerfile: 'Dockerfile.node' },
    'minileetcode-runner-gcc:latest': { dockerfile: 'Dockerfile.cpp' },
    'minileetcode-runner-java:latest': { dockerfile: 'Dockerfile.java' }
};

const runDockerCli = (args, options = {}) =>
    new Promise((resolve) => {
        execFile(
            'docker',
            args,
            {
                maxBuffer: DOCKER_OUTPUT_MAX_BUFFER,
                ...options,
            },
            (error, stdout, stderr) => {
                resolve({ error, stdout, stderr });
            }
        );
    });

const getDockerErrorMessage = (error, stdout = '', stderr = '') =>
    (stderr || stdout || error?.message || 'Unknown Docker error').trim();

const isMissingImageError = (message = '') => /no such image|no such object/i.test(message);

const isDockerInfrastructureError = (message = '', exitCode = 0) =>
    exitCode === 125 ||
    /error response from daemon|cannot connect to the docker daemon|permission denied|client version .* too old|no such container|cannot start container|oci runtime create failed/i.test(
        message
    );

const shouldCleanupTempFiles = () => {
    if (process.env.CLEANUP_ENABLED === 'true') return true;
    if (process.env.CLEANUP_ENABLED === 'false') return false;
    return env.NODE_ENV === 'production';
};

const resolveExecutorDir = async () => {
    const candidates = [
        process.env.SANDBOX_ASSETS_DIR,
        path.resolve(process.cwd(), 'executor'),
        path.resolve(process.cwd(), '../executor'),
    ].filter(Boolean);

    for (const candidate of candidates) {
        if (await fs.pathExists(candidate)) {
            return candidate;
        }
    }

    return null;
};

const validateDockerAvailable = async () => {
    const { error, stdout, stderr } = await runDockerCli(['version', '--format', '{{.Server.Version}}']);

    if (error) {
        const errorMessage = getDockerErrorMessage(error, stdout, stderr);
        logger.error('Docker daemon is not available', { error: errorMessage });
        return { available: false, error: errorMessage };
    }

    return { available: true, version: stdout.trim() };
};

const inspectImage = async (imageName) => {
    const { error, stdout, stderr } = await runDockerCli(['image', 'inspect', imageName]);

    if (!error) {
        return { exists: true };
    }

    const errorMessage = getDockerErrorMessage(error, stdout, stderr);
    if (isMissingImageError(errorMessage)) {
        logger.warn(`Docker image not found: ${imageName}`);
        return { exists: false, missing: true };
    }

    logger.error(`Failed to inspect Docker image ${imageName}`, { error: errorMessage });
    return { exists: false, missing: false, error: errorMessage };
};

const buildImage = async (imageName) => {
    if (imageBuildPromises.has(imageName)) {
        return imageBuildPromises.get(imageName);
    }

    const buildPromise = (async () => {
        const buildSpec = SANDBOX_IMAGE_BUILD_SPECS[imageName];
        if (!buildSpec) {
            return {
                available: false,
                error: `Sandbox image not available: ${imageName}. No build recipe is configured.`,
            };
        }

        const executorDir = await resolveExecutorDir();
        if (!executorDir) {
            return {
                available: false,
                error: `Sandbox image not available: ${imageName}. Executor assets directory was not found.`,
            };
        }

        const dockerfilePath = path.join(executorDir, buildSpec.dockerfile);
        if (!(await fs.pathExists(dockerfilePath))) {
            return {
                available: false,
                error: `Sandbox image not available: ${imageName}. Missing ${buildSpec.dockerfile}.`,
            };
        }

        logger.info(`Building sandbox image: ${imageName}`, {
            dockerfile: dockerfilePath,
            context: executorDir,
        });

        const { error, stdout, stderr } = await runDockerCli(
            ['build', '-t', imageName, '-f', dockerfilePath, executorDir],
            {
                maxBuffer: DOCKER_BUILD_MAX_BUFFER,
            }
        );

        if (error) {
            const errorMessage = getDockerErrorMessage(error, stdout, stderr);
            logger.error(`Failed to build sandbox image ${imageName}`, { error: errorMessage });
            return {
                available: false,
                error: `Failed to build sandbox image ${imageName}: ${errorMessage}`,
            };
        }

        const imageState = await inspectImage(imageName);
        if (!imageState.exists) {
            return {
                available: false,
                error:
                    imageState.error ||
                    `Sandbox image ${imageName} is still unavailable after the build completed.`,
            };
        }

        logger.info(`Sandbox image ready: ${imageName}`);
        return { available: true };
    })().finally(() => {
        imageBuildPromises.delete(imageName);
    });

    imageBuildPromises.set(imageName, buildPromise);
    return buildPromise;
};

const ensureImageAvailable = async (imageName) => {
    const imageState = await inspectImage(imageName);
    if (imageState.exists) {
        return { available: true };
    }

    if (!imageState.missing) {
        return {
            available: false,
            error: `Unable to inspect sandbox image ${imageName}: ${imageState.error}`,
        };
    }

    if (!AUTO_BUILD_SANDBOX_IMAGES) {
        return {
            available: false,
            error: `Sandbox image not available: ${imageName}. Please rebuild executor images.`,
        };
    }

    return buildImage(imageName);
};

const buildContainerCommand = (config, executionId) => {
    const steps = [`cd '${executionId}'`];

    if (config.compileCommand) {
        steps.push(`${config.compileCommand()} || exit ${COMPILATION_FAILURE_EXIT_CODE}`);
    }

    steps.push(config.executeCommand());

    return steps.join(' && ');
};

const createContainer = async (config, executionId) => {
    const containerName = `sandbox-${executionId.substring(0, 12)}`;
    const containerCommand = buildContainerCommand(config, executionId);

    logger.debug(`Creating sandbox container for ${executionId}`, {
        image: config.image,
        container: containerName,
        timeout: config.timeout,
    });

    const { error, stdout, stderr } = await runDockerCli([
        'create',
        '--network',
        'none',
        '--security-opt=no-new-privileges:true',
        '--pids-limit',
        '64',
        `--memory=${config.memory}`,
        '--cpus',
        '0.5',
        '--name',
        containerName,
        '--user',
        config.user,
        '-w',
        '/usr/src/app',
        config.image,
        'sh',
        '-lc',
        containerCommand,
    ]);

    if (error) {
        throw new Error(getDockerErrorMessage(error, stdout, stderr));
    }

    return containerName;
};

const copyFilesToContainer = async (containerName, localTempDir, executionId) => {
    logger.debug(`Copying execution files for ${executionId}`, {
        container: containerName,
        source: localTempDir,
    });

    const { error, stdout, stderr } = await runDockerCli(['cp', localTempDir, `${containerName}:/usr/src/app/`]);

    if (error) {
        throw new Error(getDockerErrorMessage(error, stdout, stderr));
    }
};

const removeContainer = async (containerName) => {
    const { error } = await runDockerCli(['rm', '-f', containerName]);
    if (error) {
        logger.debug(`Sandbox container cleanup skipped for ${containerName}`);
    }
};

const startContainer = async (config, containerName, executionId) =>
    new Promise((resolve) => {
        const startTime = performance.now();
        const timeoutMs = (config.timeout + 5) * 1000;
        let completed = false;

        const child = execFile(
            'docker',
            ['start', '-a', containerName],
            { maxBuffer: DOCKER_OUTPUT_MAX_BUFFER },
            (error, stdout, stderr) => {
                clearTimeout(timeoutId);

                if (completed) {
                    return;
                }

                completed = true;
                const runTime = performance.now() - startTime;
                const normalizedStdout = stdout.trim();
                const normalizedStderr = stderr.trim();

                logger.debug(`Sandbox container finished for ${executionId}`, {
                    container: containerName,
                    exitCode: error?.code ?? 0,
                    runtime: runTime,
                });

                if (error) {
                    if (error.code === COMPILATION_FAILURE_EXIT_CODE) {
                        return resolve({
                            status: 'COMPILATION_ERROR',
                            stdout: normalizedStdout,
                            stderr: (normalizedStderr || normalizedStdout || error.message).trim(),
                            runTime: 0,
                            executionId,
                        });
                    }

                    const errorMessage = getDockerErrorMessage(error, normalizedStdout, normalizedStderr);
                    if (isDockerInfrastructureError(errorMessage, error.code)) {
                        return resolve({
                            status: 'INTERNAL_ERROR',
                            stdout: normalizedStdout,
                            stderr: errorMessage,
                            runTime: 0,
                            executionId,
                        });
                    }

                    return resolve({
                        status: 'RUNTIME_ERROR',
                        stdout: normalizedStdout,
                        stderr: (normalizedStderr || error.message).trim(),
                        runTime,
                        executionId,
                    });
                }

                return resolve({
                    status: 'SUCCESS',
                    stdout: normalizedStdout,
                    stderr: normalizedStderr,
                    runTime,
                    executionId,
                });
            }
        );

        const timeoutId = setTimeout(() => {
            if (completed) {
                return;
            }

            completed = true;
            logger.warn(`Execution timeout: ${executionId}`, { timeout: timeoutMs, container: containerName });

            runDockerCli(['kill', containerName]).catch(() => {
                logger.debug(`Failed to kill timed out container ${containerName}`);
            });

            child.kill();

            resolve({
                status: 'TIMEOUT',
                stdout: '',
                stderr: 'Time Limit Exceeded',
                runTime: config.timeout * 1000,
                executionId,
            });
        }, timeoutMs);
    });

const executeInSandbox = async (config, localTempDir, executionId) => {
    const containerName = await createContainer(config, executionId);

    try {
        await copyFilesToContainer(containerName, localTempDir, executionId);
        return await startContainer(config, containerName, executionId);
    } finally {
        await removeContainer(containerName);
    }
};

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
            executionId: 'unknown',
        };
    }

    const executionId = uuidv4();
    const localTempDir = path.join(process.cwd(), 'tmp', executionId);

    logger.info(`Starting code execution: ${executionId}`, {
        language,
        codeSize: code.length,
        inputSize: input ? input.length : 0,
    });

    try {
        const dockerState = await validateDockerAvailable();
        if (!dockerState.available) {
            return {
                status: 'INTERNAL_ERROR',
                stdout: '',
                stderr: `Docker daemon is not available: ${dockerState.error}`,
                runTime: 0,
                executionId,
            };
        }

        const imageState = await ensureImageAvailable(config.image);
        if (!imageState.available) {
            logger.error(`Sandbox image unavailable: ${config.image}`, { executionId, error: imageState.error });
            return {
                status: 'INTERNAL_ERROR',
                stdout: '',
                stderr: imageState.error,
                runTime: 0,
                executionId,
            };
        }

        await fs.ensureDir(localTempDir);

        const codeFilePath = path.join(localTempDir, config.fileName);
        const inputFilePath = path.join(localTempDir, 'input.txt');

        await fs.writeFile(codeFilePath, code, 'utf8');
        await fs.writeFile(inputFilePath, input || '', 'utf8');

        await fs.chmod(localTempDir, 0o777);
        await fs.chmod(codeFilePath, 0o666);
        await fs.chmod(inputFilePath, 0o666);

        const result = await executeInSandbox(config, localTempDir, executionId);

        logger.info(`Execution completed: ${executionId}`, {
            status: result.status,
            runtime: result.runTime,
            outputLength: result.stdout.length,
        });

        return result;
    } catch (err) {
        const errorMessage = err.message || String(err);
        logger.error(`Sandbox internal error: ${executionId}`, {
            error: errorMessage,
            stack: err.stack,
        });

        return {
            status: 'INTERNAL_ERROR',
            stdout: '',
            stderr: `Sandbox execution error: ${errorMessage}`,
            runTime: 0,
            executionId,
        };
    } finally {
        if (shouldCleanupTempFiles()) {
            fs.remove(localTempDir).catch(() => {});
            logger.debug(`Cleaned up: ${localTempDir}`);
        } else {
            logger.debug(`Kept temp directory for debugging: ${localTempDir}`);
        }
    }
};
