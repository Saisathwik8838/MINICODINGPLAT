import { logger } from '../utils/logger.js';

const titleFromSlug = (slug) => {
    if (!slug) return '';
    return slug.split('-').map(word => Math.max(0, word.length) > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word).join(' ');
};

const normalizeDifficulty = (raw) => {
    if (typeof raw === 'number') {
        if (raw === 1) return 'EASY';
        if (raw === 2) return 'MEDIUM';
        if (raw === 3) return 'HARD';
    } else if (typeof raw === 'string') {
        const u = raw.toUpperCase();
        if (u === 'EASY' || u === 'MEDIUM' || u === 'HARD') return u;
    }
    return 'MEDIUM';
};

export const parseTestCases = (raw) => {
    if (raw === null || raw === undefined) return [];
    let parsed;
    
    if (typeof raw === 'string') {
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            return [];
        }
    } else {
        parsed = raw;
    }

    const testCases = [];
    
    if (Array.isArray(parsed)) {
        for (let i = 0; i < parsed.length; i++) {
            const item = parsed[i];
            const input = item.input;
            const output = item.output;
            if (input !== null && input !== undefined && input !== '' && output !== null && output !== undefined && output !== '') {
                testCases.push({
                    input: String(input),
                    expectedOutput: String(output),
                    isHidden: false,
                    order: 0
                });
            }
        }
    } else if (typeof parsed === 'object' && parsed !== null) {
        const inputs = parsed.inputs || [];
        const outputs = parsed.outputs || [];
        
        const len = Math.min(inputs.length, outputs.length);
        for (let i = 0; i < len; i++) {
            const input = inputs[i];
            const output = outputs[i];
            
            if (input !== null && input !== undefined && input !== '' && output !== null && output !== undefined && output !== '') {
                testCases.push({
                    input: String(input),
                    expectedOutput: String(output),
                    isHidden: false,
                    order: 0
                });
            }
        }
    }

    const maxCases = Math.min(testCases.length, 20);
    const finalCases = [];
    for (let i = 0; i < maxCases; i++) {
        finalCases.push({
            input: testCases[i].input,
            expectedOutput: testCases[i].expectedOutput,
            isHidden: i >= 2,
            order: i
        });
    }

    return finalCases;
};

export const normalizeRow = (row) => {
    const slug = row.question || row.task_id || '';
    const title = row.title || titleFromSlug(slug);
    
    return {
        title: title,
        slug: slug,
        description: row.problem_description || '',
        difficulty: normalizeDifficulty(row.difficulty),
        timeLimit: 5.0,
        memoryLimit: 256,
        isActive: true,
        tags: Array.isArray(row.topic_tags) ? row.topic_tags : (Array.isArray(row.tags) ? row.tags : []),
        starterCode: row.starter_code || '',
        testCases: parseTestCases(row.test_cases || row.input_output)
    };
};

export const normalizeAll = (rows) => {
    if (!Array.isArray(rows)) return [];
    
    const valid = rows.map(normalizeRow).filter(p => p.slug && p.description);
    
    const map = new Map();
    for (const p of valid) {
        if (!map.has(p.slug)) {
            map.set(p.slug, p);
        }
    }
    
    const result = Array.from(map.values());
    logger.info(`Normalized ${result.length} valid problems`);
    return result;
};

export const validateNormalized = (problem) => {
    const errors = [];
    if (!problem.title) errors.push('Title is empty');
    if (!problem.slug) errors.push('Slug is empty');
    if (!problem.description || problem.description.length <= 20) errors.push('Description is too short');
    if (!['EASY', 'MEDIUM', 'HARD'].includes(problem.difficulty)) errors.push('Invalid difficulty');
    if (!Array.isArray(problem.testCases)) errors.push('Test cases must be an array');
    
    return {
        valid: errors.length === 0,
        errors
    };
};
