import { randomArray, formatInput } from './base.generator.js';

const solve = (nums) => {
    let maxSoFar = nums[0];
    let maxEndingHere = nums[0];
    for (let i = 1; i < nums.length; i++) {
        maxEndingHere = Math.max(nums[i], maxEndingHere + nums[i]);
        maxSoFar = Math.max(maxSoFar, maxEndingHere);
    }
    return maxSoFar.toString();
};

const generateCase = (nums, isHidden, order) => {
    const input = formatInput(nums.join(' '));
    const expectedOutput = solve(nums);
    return { input, expectedOutput, isHidden, order };
};

export default {
    generateCases: () => {
        const cases = [];
        let order = 0;

        // 3 visible cases
        cases.push(generateCase([-2, 1, -3, 4, -1, 2, 1, -5, 4], false, order++));
        cases.push(generateCase([1], false, order++));
        cases.push(generateCase([5, 4, -1, 7, 8], false, order++));

        // 5 hidden cases
        for (let i = 0; i < 5; i++) {
            const len = Math.floor(Math.random() * (50 - 10 + 1)) + 10;
            cases.push(generateCase(randomArray(len, -100, 100), true, order++));
        }

        // 1 stress case
        cases.push(generateCase(randomArray(10000, -1000, 1000), true, order++));

        return cases;
    }
};
