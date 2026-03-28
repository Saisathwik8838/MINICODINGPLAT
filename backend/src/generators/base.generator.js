export const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const randomArray = (len, min, max) => {
    const arr = [];
    for (let i = 0; i < len; i++) {
        arr.push(randomInt(min, max));
    }
    return arr;
};

export const shuffle = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

export const randomString = (len) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let res = '';
    for (let i = 0; i < len; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
};

export const formatInput = (...parts) => {
    return parts.join('\n');
};
