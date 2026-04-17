const compareOutput = (expected, actual) => {
    // 1. Helper to canonicalize parsed JSON objects
    const canonicalizeJSON = (obj) => {
        if (Array.isArray(obj)) {
            return obj.map(item => canonicalizeJSON(item));
        } else if (obj !== null && typeof obj === 'object') {
            const keys = Object.keys(obj).sort();
            const canonicalObj = {};
            for (const k of keys) {
                canonicalObj[k] = canonicalizeJSON(obj[k]);
            }
            return canonicalObj;
        } else if (typeof obj === 'string') {
            const lowerObj = obj.trim().toLowerCase();
            if (lowerObj === 'true') return true;
            if (lowerObj === 'false') return false;
            // Parse numeric strings inside JSON if safely converting
            if (!isNaN(obj.trim()) && obj.trim() !== '') return Number(obj.trim());
            return obj.trim();
        }
        return obj; // Pass through numbers, booleans natively from JSON
    };

    // 2. Determine type and parse value
    const parseValue = (val) => {
        if (val === undefined || val === null) return '';
        
        let strVal = String(val).trim();
        if (!strVal) return strVal;

        const lowerStr = strVal.toLowerCase();
        if (lowerStr === 'true') return true;
        if (lowerStr === 'false') return false;

        try {
            if ((strVal.startsWith('[') && strVal.endsWith(']')) || 
                (strVal.startsWith('{') && strVal.endsWith('}'))) {
                const parsedJSON = JSON.parse(strVal);
                return canonicalizeJSON(parsedJSON);
            }
        } catch (e) {
            // Fall through if not valid JSON
        }

        if (!isNaN(strVal) && strVal.trim() !== '') {
            return Number(strVal);
        }

        return strVal;
    };

    // 3. Deep comparison with floating point tolerance
    const compareParsed = (pExp, pAct) => {
        if (typeof pExp !== typeof pAct) return false;

        if (typeof pExp === 'number') {
            return Math.abs(pExp - pAct) <= 1e-6;
        }

        if (typeof pExp === 'boolean' || typeof pExp === 'string') {
            return pExp === pAct;
        }

        if (Array.isArray(pExp)) {
            if (!Array.isArray(pAct) || pExp.length !== pAct.length) return false;
            for (let i = 0; i < pExp.length; i++) {
                if (!compareParsed(pExp[i], pAct[i])) return false;
            }
            return true;
        }

        if (pExp !== null && typeof pExp === 'object') {
            const keys1 = Object.keys(pExp);
            const keys2 = Object.keys(pAct);
            if (keys1.length !== keys2.length) return false;
            for (const k of keys1) {
                if (!compareParsed(pExp[k], pAct[k])) return false;
            }
            return true;
        }

        return pExp === pAct;
    };

    // 4. Split and evaluate multiline properly
    const preprocessMultiline = (text) => {
        if (text === undefined || text === null) return [];
        return String(text)
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0);
    };

    const expLines = preprocessMultiline(expected);
    const actLines = preprocessMultiline(actual);

    if (expLines.length !== actLines.length) {
        return false;
    }

    for (let i = 0; i < expLines.length; i++) {
        const pExp = parseValue(expLines[i]);
        const pAct = parseValue(actLines[i]);

        if (!compareParsed(pExp, pAct)) {
            return false;
        }
    }

    return true;
};

module.exports = { compareOutput };
