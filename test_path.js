import path from 'path';
import 'dotenv/config';

const hostProjectPath = process.env.HOST_PROJECT_PATH || "c:\\Users\\saisa\\OneDrive\\Desktop\\MiniCodingPlat";
const executionId = "test-uuid";

const resolveHostTempDir = (executionId) => {
    if (!hostProjectPath) {
        return path.join(process.cwd(), 'tmp', executionId);
    }
    const normalized = hostProjectPath.replace(/\\/g, '/').replace(/\/$/, '');
    return `${normalized}/tmp/${executionId}`;
};

console.log("Input PATH:", hostProjectPath);
console.log("Resolved PATH:", resolveHostTempDir(executionId));
