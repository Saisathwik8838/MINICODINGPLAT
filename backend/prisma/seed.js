import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed...');

    // 1. Upsert Admin User
    const adminEmail = 'admin@minileetcode.com';
    const adminPasswordMatch = 'Admin@123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPasswordMatch, salt);

    const adminUser = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            username: 'admin',
            email: adminEmail,
            role: 'ADMIN',
            passwordHash: passwordHash
        }
    });
    console.log(`Created admin user: ${adminUser.username} (${adminUser.email})`);

    // 2. Create 5 Problems with TestCases
    const problemsData = [
        {
            slug: 'two-sum',
            title: 'Two Sum',
            difficulty: 'EASY',
            description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

**Example 1:**
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`

**Example 2:**
\`\`\`
Input: nums = [3,2,4], target = 6
Output: [1,2]
\`\`\`

**Constraints:**
* \`2 <= nums.length <= 10^4\`
* \`-10^9 <= nums[i] <= 10^9\`
* \`-10^9 <= target <= 10^9\`
* Only one valid answer exists.
`,
            testCases: [
                { input: 'nums = [2,7,11,15]\ntarget = 9', expectedOutput: '[0,1]', isHidden: false },
                { input: 'nums = [3,2,4]\ntarget = 6', expectedOutput: '[1,2]', isHidden: false },
                { input: 'nums = [3,3]\ntarget = 6', expectedOutput: '[0,1]', isHidden: false },
                { input: 'nums = [1,2,3,4,5]\ntarget = 9', expectedOutput: '[3,4]', isHidden: true },
                { input: 'nums = [-1,-2,-3,-4,-5]\ntarget = -8', expectedOutput: '[2,4]', isHidden: true }
            ]
        },
        {
            slug: 'reverse-string',
            title: 'Reverse String',
            difficulty: 'EASY',
            description: `Write a function that reverses a string. The input string is given as an array of characters \`s\`.

You must do this by modifying the input array in-place with \`O(1)\` extra memory.

**Example 1:**
\`\`\`
Input: s = ["h","e","l","l","o"]
Output: ["o","l","l","e","h"]
\`\`\`

**Example 2:**
\`\`\`
Input: s = ["H","a","n","n","a","h"]
Output: ["h","a","n","n","a","H"]
\`\`\`

**Constraints:**
* \`1 <= s.length <= 10^5\`
* \`s[i]\` is a printable ascii character.
`,
            testCases: [
                { input: 'hello', expectedOutput: 'olleh', isHidden: false },
                { input: 'OpenAI', expectedOutput: 'IAnepO', isHidden: false },
                { input: 'a', expectedOutput: 'a', isHidden: false },
                { input: '', expectedOutput: '', isHidden: true },
                { input: 'racecar', expectedOutput: 'racecar', isHidden: true }
            ]
        },
        {
            slug: 'fizzbuzz',
            title: 'FizzBuzz',
            difficulty: 'EASY',
            description: `Given an integer \`n\`, return a string array \`answer\` (1-indexed) where:
* \`answer[i] == "FizzBuzz"\` if \`i\` is divisible by 3 and 5.
* \`answer[i] == "Fizz"\` if \`i\` is divisible by 3.
* \`answer[i] == "Buzz"\` if \`i\` is divisible by 5.
* \`answer[i] == i\` (as a string) if none of the above conditions are true.

**Example 1:**
\`\`\`
Input: n = 3
Output: ["1","2","Fizz"]
\`\`\`

**Example 2:**
\`\`\`
Input: n = 5
Output: ["1","2","Fizz","4","Buzz"]
\`\`\`
`,
            testCases: [
                { input: '3', expectedOutput: '1\n2\nFizz', isHidden: false },
                { input: '5', expectedOutput: '1\n2\nFizz\n4\nBuzz', isHidden: false },
                { input: '15', expectedOutput: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz', isHidden: false },
                { input: '1', expectedOutput: '1', isHidden: true },
                { input: '10', expectedOutput: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz', isHidden: true }
            ]
        },
        {
            slug: 'palindrome-check',
            title: 'Palindrome Check',
            difficulty: 'MEDIUM',
            description: `A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.

Given a string \`s\`, return \`true\` if it is a palindrome, or \`false\` otherwise.

**Example 1:**
\`\`\`
Input: s = "A man, a plan, a canal: Panama"
Output: true
Explanation: "amanaplanacanalpanama" is a palindrome.
\`\`\`

**Example 2:**
\`\`\`
Input: s = "race a car"
Output: false
Explanation: "raceacar" is not a palindrome.
\`\`\`
`,
            testCases: [
                { input: 'racecar', expectedOutput: 'true', isHidden: false },
                { input: 'hello', expectedOutput: 'false', isHidden: false },
                { input: 'A man a plan a canal Panama', expectedOutput: 'true', isHidden: false },
                { input: ' ', expectedOutput: 'true', isHidden: true },
                { input: '0P', expectedOutput: 'false', isHidden: true }
            ]
        },
        {
            slug: 'maximum-subarray',
            title: 'Maximum Subarray',
            difficulty: 'MEDIUM',
            description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.

**Example 1:**
\`\`\`
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6
Explanation: The subarray [4,-1,2,1] has the largest sum 6.
\`\`\`

**Example 2:**
\`\`\`
Input: nums = [1]
Output: 1
Explanation: The subarray [1] has the largest sum 1.
\`\`\`

**Example 3:**
\`\`\`
Input: nums = [5,4,-1,7,8]
Output: 23
Explanation: The subarray [5,4,-1,7,8] has the largest sum 23.
\`\`\`
`,
            testCases: [
                { input: '[-2,1,-3,4,-1,2,1,-5,4]', expectedOutput: '6', isHidden: false },
                { input: '[1]', expectedOutput: '1', isHidden: false },
                { input: '[5,4,-1,7,8]', expectedOutput: '23', isHidden: false },
                { input: '[-1]', expectedOutput: '-1', isHidden: true },
                { input: '[-2,-1]', expectedOutput: '-1', isHidden: true }
            ]
        }
    ];

    for (const p of problemsData) {
        const problem = await prisma.problem.upsert({
            where: { slug: p.slug },
            update: {
                title: p.title,
                description: p.description,
                difficulty: p.difficulty
            },
            create: {
                slug: p.slug,
                title: p.title,
                description: p.description,
                difficulty: p.difficulty,
                timeLimit: 5.0,
                memoryLimit: 256
            }
        });

        console.log(`Upserted problem: ${problem.title}`);

        // Delete existing testcases to re-insert cleanly
        await prisma.testCase.deleteMany({
            where: { problemId: problem.id }
        });

        // Insert new test cases
        for (let i = 0; i < p.testCases.length; i++) {
            const tc = p.testCases[i];
            await prisma.testCase.create({
                data: {
                    problemId: problem.id,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    isHidden: tc.isHidden,
                    order: i
                }
            });
        }
        console.log(` - Created ${p.testCases.length} testcases for ${problem.title}`);
    }

    console.log('Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
