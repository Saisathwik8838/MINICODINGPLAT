const splitTopLevel = (value, delimiter) => {
    const parts = [];
    let current = '';
    let bracketDepth = 0;
    let braceDepth = 0;
    let parenDepth = 0;
    let quote = null;
    let escaped = false;

    for (const char of value) {
        if (quote) {
            current += char;

            if (escaped) {
                escaped = false;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                continue;
            }

            if (char === quote) {
                quote = null;
            }

            continue;
        }

        if (char === '"' || char === "'") {
            quote = char;
            current += char;
            continue;
        }

        if (char === '[') bracketDepth++;
        else if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);
        else if (char === '{') braceDepth++;
        else if (char === '}') braceDepth = Math.max(0, braceDepth - 1);
        else if (char === '(') parenDepth++;
        else if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

        if (
            char === delimiter &&
            bracketDepth === 0 &&
            braceDepth === 0 &&
            parenDepth === 0
        ) {
            parts.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    if (current.trim()) {
        parts.push(current.trim());
    }

    return parts;
};

const getTopLevelAssignmentValue = (segment) => {
    let bracketDepth = 0;
    let braceDepth = 0;
    let parenDepth = 0;
    let quote = null;
    let escaped = false;

    for (let index = 0; index < segment.length; index++) {
        const char = segment[index];

        if (quote) {
            if (escaped) {
                escaped = false;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                continue;
            }

            if (char === quote) {
                quote = null;
            }

            continue;
        }

        if (char === '"' || char === "'") {
            quote = char;
            continue;
        }

        if (char === '[') bracketDepth++;
        else if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);
        else if (char === '{') braceDepth++;
        else if (char === '}') braceDepth = Math.max(0, braceDepth - 1);
        else if (char === '(') parenDepth++;
        else if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

        if (
            char === '=' &&
            bracketDepth === 0 &&
            braceDepth === 0 &&
            parenDepth === 0
        ) {
            return segment.slice(index + 1).trim();
        }
    }

    return null;
};

export const normalizeTestCaseInput = (rawInput) => {
    if (typeof rawInput !== 'string') return rawInput;

    const trimmed = rawInput.trim();
    if (!trimmed.includes('=')) return trimmed;

    const segments = splitTopLevel(trimmed, ',');
    if (segments.length === 0) return trimmed;

    const values = [];

    for (const segment of segments) {
        const value = getTopLevelAssignmentValue(segment);
        if (value === null || value === '') {
            return trimmed;
        }
        values.push(value);
    }

    return values.join('\n');
};

export const normalizeVisibleTestCases = (testCases = []) =>
    testCases.map((testCase) => ({
        ...testCase,
        input: normalizeTestCaseInput(testCase.input),
    }));
