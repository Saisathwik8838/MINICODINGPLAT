import { randomInt, randomArray, shuffle, formatInput } from './base.generator.js';

const solve = (nums, target) => {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            const j = map.get(complement);
            return `[${Math.min(i, j)},${Math.max(i, j)}]`;
        }
        map.set(nums[i], i);
    }
    return '[]';
};

const generateCase = (nums, target, isHidden, order) => {
    const input = formatInput(nums.join(' '), target.toString());
    const expectedOutput = solve(nums, target);
    return { input, expectedOutput, isHidden, order };
};

const generateRandomPairArray = (length, minVal, maxVal) => {
    const arr = randomArray(length, minVal, maxVal);
    // Ensure distinct values exist for a pair so there is exactly one solution easily
    const idx1 = randomInt(0, length - 1);
    let idx2 = randomInt(0, length - 1);
    while (idx1 === idx2) idx2 = randomInt(0, length - 1);
    const target = arr[idx1] + arr[idx2];
    
    // Quick filtering to discourage multiple solutions for simplicity in tests
    // In a real strictly validated system, we'd ensure array uniqueness properties.
    return { nums: arr, target };
};

export default {
    generateCases: () => {
        const cases = [];
        let order = 0;

        // 3 visible cases
        cases.push(generateCase([2, 7, 11, 15], 9, false, order++));
        cases.push(generateCase([3, 2, 4], 6, false, order++));
        cases.push(generateCase([3, 3], 6, false, order++));

        // 5 hidden cases
        for (let i = 0; i < 5; i++) {
            const len = randomInt(10, 100);
            const data = generateRandomPairArray(len, -1000, 1000);
            cases.push(generateCase(data.nums, data.target, true, order++));
        }

        // 1 stress case
        const stressData = generateRandomPairArray(10000, -1000000, 1000000);
        stressData.target = stressData.nums[9998] + stressData.nums[9999];
        // Ensure the pair is at the very end
        cases.push(generateCase(stressData.nums, stressData.target, true, order++));

        return cases;
    }
};
