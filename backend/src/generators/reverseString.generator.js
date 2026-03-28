import { randomString, formatInput } from './base.generator.js';

const solve = (s) => {
    return s.split('').reverse().join('');
};

const generateCase = (s, isHidden, order) => {
    const input = formatInput(s);
    const expectedOutput = solve(s);
    return { input, expectedOutput, isHidden, order };
};

export default {
    generateCases: () => {
        const cases = [];
        let order = 0;

        // 3 visible cases
        cases.push(generateCase("hello", false, order++));
        cases.push(generateCase("OpenAI", false, order++));
        cases.push(generateCase("abcde", false, order++));

        // 5 hidden cases
        for (let i = 0; i < 5; i++) {
            const len = Math.floor(Math.random() * (100 - 10 + 1)) + 10;
            cases.push(generateCase(randomString(len), true, order++));
        }

        // 1 stress case
        cases.push(generateCase(randomString(10000), true, order++));

        return cases;
    }
};
