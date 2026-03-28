import { formatInput } from './base.generator.js';

const solve = (n) => {
    const result = [];
    for (let i = 1; i <= n; i++) {
        if (i % 15 === 0) result.push("FizzBuzz");
        else if (i % 3 === 0) result.push("Fizz");
        else if (i % 5 === 0) result.push("Buzz");
        else result.push(i.toString());
    }
    return result.join('\n');
};

const generateCase = (n, isHidden, order) => {
    const input = formatInput(n.toString());
    const expectedOutput = solve(n);
    return { input, expectedOutput, isHidden, order };
};

export default {
    generateCases: () => {
        const cases = [];
        let order = 0;

        // 3 visible cases
        cases.push(generateCase(3, false, order++));
        cases.push(generateCase(5, false, order++));
        cases.push(generateCase(15, false, order++));

        // 5 hidden cases
        cases.push(generateCase(1, true, order++));
        cases.push(generateCase(2, true, order++));
        cases.push(generateCase(7, true, order++));
        cases.push(generateCase(20, true, order++));
        cases.push(generateCase(50, true, order++));

        // 1 stress case
        cases.push(generateCase(10000, true, order++));

        return cases;
    }
};
