import { randomInt, randomString, formatInput } from './base.generator.js';

const solve = (s) => {
    const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isPal = clean === clean.split('').reverse().join('');
    return isPal ? "true" : "false";
};

const generateCase = (s, isHidden, order) => {
    const input = formatInput(s);
    const expectedOutput = solve(s);
    return { input, expectedOutput, isHidden, order };
};

const generatePalindromeOfLen = (len) => {
    const half = randomString(Math.floor(len / 2));
    const middle = len % 2 !== 0 ? randomString(1) : '';
    return half + middle + half.split('').reverse().join('');
};

export default {
    generateCases: () => {
        const cases = [];
        let order = 0;

        // 3 visible cases
        cases.push(generateCase("racecar", false, order++));
        cases.push(generateCase("hello", false, order++));
        cases.push(generateCase("A man a plan a canal Panama", false, order++));

        // 5 hidden cases
        cases.push(generateCase(generatePalindromeOfLen(10), true, order++));
        cases.push(generateCase(generatePalindromeOfLen(51), true, order++));
        cases.push(generateCase(randomString(20), true, order++)); // likely false
        cases.push(generateCase("Was it a car or a cat I saw", true, order++));
        cases.push(generateCase(randomString(100), true, order++)); // likely false

        // 1 stress case
        cases.push(generateCase(generatePalindromeOfLen(10000), true, order++));

        return cases;
    }
};
