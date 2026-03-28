import twoSumGenerator from './twoSum.generator.js';
import reverseStringGenerator from './reverseString.generator.js';
import fizzBuzzGenerator from './fizzBuzz.generator.js';
import palindromeCheckGenerator from './palindromeCheck.generator.js';
import maximumSubarrayGenerator from './maximumSubarray.generator.js';

export const generatorRegistry = {
    'two-sum': twoSumGenerator,
    'reverse-string': reverseStringGenerator,
    'fizzbuzz': fizzBuzzGenerator,
    'palindrome-check': palindromeCheckGenerator,
    'maximum-subarray': maximumSubarrayGenerator,
};

export const getSupportedSlugs = () => Object.keys(generatorRegistry);
