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

// ─────────────────────────────────────────────────────────────────────────────
// FIX 1: Added JAVASCRIPT as an alias for NODEJS so frontend submissions work.
//         Both keys point to the same config object.
// FIX 2: executeCommand now pipes via /sandbox/input.txt (absolute path inside
//         the container) so it can never fail when the cwd changes.
// FIX 3: Java compileCommand uses a semicolon-separated fallback so compilation
//         errors still produce stderr instead of a silent failure.
// ─────────────────────────────────────────────────────────────────────────────
const _nodeConfig = {
    image: 'minileetcode-runner-node:latest',
    fileName: 'solution.js',
    compileCommand: null,
    // Use absolute path so stdin redirect is unambiguous after the cd
    executeCommand: () => 'cat /sandbox/input.txt | node /sandbox/solution.js',
    timeout: 10,
    memory: '128m',
    user: 'node'
};

const LANGUAGE_CONFIGS = {
    PYTHON: {
        image: 'minileetcode-runner-python:latest',
        fileName: 'solution.py',
        compileCommand: null,
        executeCommand: () => 'cat /sandbox/input.txt | python3 /sandbox/solution.py',
        timeout: 10,
        memory: '128m',
        user: 'runner'
    },
    // FIX 1: both JAVASCRIPT and NODEJS map to the same config
    JAVASCRIPT: _nodeConfig,
    NODEJS: _nodeConfig,
    CPP: {
        image: 'minileetcode-runner-gcc:latest',
        fileName: 'solution.cpp',
        // FIX 3: explicit exit code on compile failure
        compileCommand: () => `g++ -O2 /sandbox/solution.cpp -o /tmp/main.out || exit ${COMPILATION_FAILURE_EXIT_CODE}`,
        executeCommand: () => 'cat /sandbox/input.txt | /tmp/main.out',
        timeout: 8,
        memory: '512m',
        user: 'runner'
    },
    JAVA: {
        image: 'minileetcode-runner-java:latest',
        fileName: 'Main.java',
        compileCommand: () => `javac -d /tmp /sandbox/Main.java || exit ${COMPILATION_FAILURE_EXIT_CODE}`,
        executeCommand: () => 'cat /sandbox/input.txt | java -cp /tmp Main',
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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const runDockerCli = (args, options = {}) =>
    new Promise((resolve) => {
        execFile(
            'docker',
            args,
            { maxBuffer: DOCKER_OUTPUT_MAX_BUFFER, ...options },
            (error, stdout, stderr) => resolve({ error, stdout, stderr })
        );
    });

const getDockerErrorMessage = (error, stdout = '', stderr = '') =>
    (stderr || stdout || error?.message || 'Unknown Docker error').trim();

const isMissingImageError = (message = '') =>
    /no such image|no such object/i.test(message);

const isDockerInfrastructureError = (message = '', exitCode = 0) =>
    exitCode === 125 ||
    /error response from daemon|cannot connect to the docker daemon|permission denied|client version .* too old|no such container|cannot start container|oci runtime create failed/i.test(message);

const shouldCleanupTempFiles = () => {
    if (process.env.CLEANUP_ENABLED === 'true') return true;
    if (process.env.CLEANUP_ENABLED === 'false') return false;
    return env.NODE_ENV === 'production';
};

// ─────────────────────────────────────────────────────────────────────────────
// FIX 4: resolveExecutorDir now also checks /usr/src/app/executor (the path
//         mounted in docker-compose.yml via SANDBOX_ASSETS_DIR).
// ─────────────────────────────────────────────────────────────────────────────
const resolveExecutorDir = async () => {
    const candidates = [
        process.env.SANDBOX_ASSETS_DIR,
        '/usr/src/app/executor',
        path.resolve(process.cwd(), 'executor'),
        path.resolve(process.cwd(), '../executor'),
    ].filter(Boolean);

    for (const candidate of candidates) {
        if (await fs.pathExists(candidate)) return candidate;
    }
    return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Docker availability / image management
// ─────────────────────────────────────────────────────────────────────────────
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
    if (!error) return { exists: true };
    const errorMessage = getDockerErrorMessage(error, stdout, stderr);
    if (isMissingImageError(errorMessage)) {
        logger.warn(`Docker image not found: ${imageName}`);
        return { exists: false, missing: true };
    }
    logger.error(`Failed to inspect Docker image ${imageName}`, { error: errorMessage });
    return { exists: false, missing: false, error: errorMessage };
};

const buildImage = async (imageName) => {
    if (imageBuildPromises.has(imageName)) return imageBuildPromises.get(imageName);

    const buildPromise = (async () => {
        const buildSpec = SANDBOX_IMAGE_BUILD_SPECS[imageName];
        if (!buildSpec) {
            return {
                available: false,
                error: `Sandbox image not available: ${imageName}. No build recipe configured.`,
            };
        }

        const executorDir = await resolveExecutorDir();
        if (!executorDir) {
            return {
                available: false,
                error: `Sandbox image not available: ${imageName}. Executor assets directory not found.`,
            };
        }

        const dockerfilePath = path.join(executorDir, buildSpec.dockerfile);
        if (!(await fs.pathExists(dockerfilePath))) {
            return {
                available: false,
                error: `Sandbox image not available: ${imageName}. Missing ${buildSpec.dockerfile}.`,
            };
        }

        logger.info(`Building sandbox image: ${imageName}`, { dockerfile: dockerfilePath, context: executorDir });

        const { error, stdout, stderr } = await runDockerCli(
            ['build', '-t', imageName, '-f', dockerfilePath, executorDir],
            { maxBuffer: DOCKER_BUILD_MAX_BUFFER }
        );

        if (error) {
            const errorMessage = getDockerErrorMessage(error, stdout, stderr);
            logger.error(`Failed to build sandbox image ${imageName}`, { error: errorMessage });
            return { available: false, error: `Failed to build sandbox image ${imageName}: ${errorMessage}` };
        }

        const imageState = await inspectImage(imageName);
        if (!imageState.exists) {
            return {
                available: false,
                error: imageState.error || `Sandbox image ${imageName} still unavailable after build.`,
            };
        }

        logger.info(`Sandbox image ready: ${imageName}`);
        return { available: true };
    })().finally(() => imageBuildPromises.delete(imageName));

    imageBuildPromises.set(imageName, buildPromise);
    return buildPromise;
};

const ensureImageAvailable = async (imageName) => {
    const imageState = await inspectImage(imageName);
    if (imageState.exists) return { available: true };
    if (!imageState.missing) {
        return { available: false, error: `Unable to inspect sandbox image ${imageName}: ${imageState.error}` };
    }
    if (!AUTO_BUILD_SANDBOX_IMAGES) {
        return { available: false, error: `Sandbox image not available: ${imageName}. Please rebuild executor images.` };
    }
    return buildImage(imageName);
};

// ─────────────────────────────────────────────────────────────────────────────
// FIX 5: Simplified container command – files are now addressed by absolute
//         path (/sandbox/*) so there is no cd or relative-path ambiguity.
//         The container working dir is set to /sandbox for safety.
// ─────────────────────────────────────────────────────────────────────────────
const buildContainerCommand = (config) => {
    if (config.compileCommand) {
        return `${config.compileCommand()} && ${config.executeCommand()}`;
    }
    return config.executeCommand();
};

// ─────────────────────────────────────────────────────────────────────────────
// FIX 6: Use `docker create -> docker cp -> docker start` to bypass volume
//         mount issues on Docker-in-Docker deployments where host paths diverge.
// ─────────────────────────────────────────────────────────────────────────────
const executeInSandbox = async (config, localTempDir, executionId) =>
    new Promise(async (resolve) => {
        const containerCommand = buildContainerCommand(config);
        const timeoutMs = (config.timeout + 5) * 1000;
        let completed = false;
        let containerId = null;
        let timeoutId = null;
        const startTime = performance.now();

        logger.debug(`Executing sandbox container for ${executionId}`, {
            image: config.image,
            command: containerCommand,
            localDir: localTempDir,
        });

        try {
            // 1. Create the container without volume mounts
            const createRes = await runDockerCli([
                'create',
                '--network', 'none',
                '--security-opt=no-new-privileges:true',
                '--pids-limit', '64',
                `--memory=${config.memory}`,
                '--cpus', '0.5',
                '--user', config.user,
                '-w', '/sandbox',
                config.image,
                'sh', '-c', containerCommand,
            ]);

            if (createRes.error) {
                const errorMessage = getDockerErrorMessage(createRes.error, createRes.stdout, createRes.stderr);
                return resolve({
                    status: 'INTERNAL_ERROR',
                    stdout: '',
                    stderr: `Failed to create container: ${errorMessage}`,
                    runTime: 0,
                    executionId,
                });
            }

            containerId = createRes.stdout.trim();

            // 2. Upload files via docker cp (avoids host-path mapping issues entirely)
            const cpRes = await runDockerCli([
                'cp',
                `${localTempDir}/.`,
                `${containerId}:/sandbox/`
            ]);

            if (cpRes.error) {
                return resolve({
                    status: 'INTERNAL_ERROR',
                    stdout: '',
                    stderr: `Failed to copy files into sandbox: ${cpRes.stderr.trim() || cpRes.error.message}`,
                    runTime: 0,
                    executionId,
                });
            }

            // Start timeout tracker
            timeoutId = setTimeout(() => {
                if (completed) return;
                completed = true;
                logger.warn(`Execution timeout: ${executionId}`, { timeout: timeoutMs });
                runDockerCli(['kill', containerId]); // Kill the container forcefully
                resolve({
                    status: 'TIMEOUT',
                    stdout: '',
                    stderr: 'Time Limit Exceeded',
                    runTime: config.timeout * 1000,
                    executionId,
                });
            }, timeoutMs);

            // 3. Start the container and wait for output
            const startRes = await runDockerCli([
                'start',
                '-a',
                containerId
            ]);

            clearTimeout(timeoutId);
            if (completed) return;
            completed = true;

            const runTime = performance.now() - startTime;
            const normalizedStdout = startRes.stdout.trim();
            const normalizedStderr = startRes.stderr.trim();
            const error = startRes.error;

            logger.debug(`Sandbox container finished for ${executionId}`, {
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

        } catch (err) {
            clearTimeout(timeoutId);
            if (!completed) {
                completed = true;
                resolve({
                    status: 'INTERNAL_ERROR',
                    stdout: '',
                    stderr: `Sandbox execution error: ${err.message}`,
                    runTime: 0,
                    executionId,
                });
            }
        } finally {
            if (containerId) {
                runDockerCli(['rm', '-f', containerId]);
            }
        }
    });

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────
export const runCodeInSandbox = async (language, code, input) => {
    // FIX 7: normalise language key so JAVASCRIPT → correct config
    const config = LANGUAGE_CONFIGS[language.toUpperCase()];
    if (!config) {
        const error = `Unsupported language: ${language}`;
        logger.error(error);
        return { status: 'INTERNAL_ERROR', stdout: '', stderr: error, runTime: 0, executionId: 'unknown' };
    }

    const executionId = uuidv4();
    const localTempDir = path.join(process.cwd(), 'tmp', executionId);

    logger.info(`Starting code execution: ${executionId}`, {
        language,
        codeSize: code.length,
        inputSize: input ? input.length : 0,
    });

    try {
        // 1. Check Docker is running
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

        // 2. Ensure the sandbox image exists (build if missing and allowed)
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

        // 3. Write code + input to a temp directory
        await fs.ensureDir(localTempDir);

        const codeFilePath = path.join(localTempDir, config.fileName);
        const inputFilePath = path.join(localTempDir, 'input.txt');

        await fs.writeFile(codeFilePath, code, 'utf8');
        await fs.writeFile(inputFilePath, input || '', 'utf8');

        // Make everything world-readable/writable so the container user can access it
        await fs.chmod(localTempDir, 0o777);
        await fs.chmod(codeFilePath, 0o666);
        await fs.chmod(inputFilePath, 0o666);

        // 4. Run
        const result = await executeInSandbox(config, localTempDir, executionId);

        logger.info(`Execution completed: ${executionId}`, {
            status: result.status,
            runtime: result.runTime,
            outputLength: result.stdout.length,
        });

        return result;
    } catch (err) {
        const errorMessage = err.message || String(err);
        logger.error(`Sandbox internal error: ${executionId}`, { error: errorMessage, stack: err.stack });
        return {
            status: 'INTERNAL_ERROR',
            stdout: '',
            stderr: `Sandbox execution error: ${errorMessage}`,
            runTime: 0,
            executionId,
        };
    } finally {
        if (shouldCleanupTempFiles()) {
            fs.remove(localTempDir).catch(() => { });
            logger.debug(`Cleaned up: ${localTempDir}`);
        } else {
            logger.debug(`Kept temp directory for debugging: ${localTempDir}`);
        }
    }
};