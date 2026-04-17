const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const util = require('util');

const execAsync = util.promisify(exec);

const LANGUAGE_CONFIG = {
  cpp: {
    extension: 'cpp',
    image: 'gcc:latest',
    runCommand: 'g++ solution.cpp -o solution && ./solution < input.txt'
  },
  python: {
    extension: 'py',
    image: 'python:3.9-slim',
    runCommand: 'python3 solution.py < input.txt'
  },
  java: {
    extension: 'java',
    image: 'openjdk:11',
    runCommand: 'javac Main.java && java Main < input.txt',
    fileName: 'Main.java'
  }
};

const executeCode = async (language, code, input) => {
  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    return { success: false, output: '', error: 'Unsupported language' };
  }

  const jobId = uuidv4();
  const jobDir = `/usr/src/app/tmp/${jobId}`;
  let containerId = null;
  
  try {
    await fs.mkdir(jobDir, { recursive: true });

    const fileName = config.fileName || `solution.${config.extension}`;
    const codeFilePath = path.join(jobDir, fileName);
    const inputFilePath = path.join(jobDir, 'input.txt');

    await fs.writeFile(codeFilePath, code);
    await fs.writeFile(inputFilePath, input || '');

    // 1. Create a container without volume mounts to avoid Docker-in-Docker path issues
    const createCmd = [
      'docker create',
      `--network=none`,
      `--memory=128m`,
      `--pids-limit=64`,
      `-w /sandbox`,
      config.image,
      `sh -c "${config.runCommand}"`
    ].join(' ');

    const { stdout: createStdout } = await execAsync(createCmd);
    containerId = createStdout.trim();

    // 2. Copy the files into the created container
    await execAsync(`docker cp ${jobDir}/. ${containerId}:/sandbox/`);

    // 3. Start the container and wait for output
    const { stdout, stderr } = await execAsync(`docker start -a ${containerId}`, { timeout: 10000 });
    
    return {
      success: true,
      output: stdout.trim(),
      error: stderr.trim()
    };
  } catch (error) {
    let errorMessage = error.stderr || error.message || 'Execution failed';
    
    if (error.killed && error.signal === 'SIGTERM') {
      errorMessage = 'Execution timed out (Time Limit Exceeded)';
      // Force kill the container because `docker start -a` timeout kills the CLI process, not the container
      if (containerId) {
        try {
          await execAsync(`docker kill ${containerId}`);
        } catch (e) { /* ignore */ }
      }
    }

    return {
      success: false,
      output: (error.stdout || '').trim(),
      error: errorMessage.trim()
    };
  } finally {
    if (containerId) {
      try {
        await execAsync(`docker rm -f ${containerId}`);
      } catch (rmError) {
        console.error(`Failed to remove container ${containerId}:`, rmError);
      }
    }

    try {
      await fs.rm(jobDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error(`Failed to clean up job directory ${jobDir}:`, cleanupError);
    }
  }
};

module.exports = { executeCode };
