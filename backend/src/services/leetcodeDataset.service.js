import { AppError } from '../middlewares/errorHandler.js';
import { logger } from '../utils/logger.js';

const BASE_URL = 'https://datasets-server.huggingface.co/rows';
const DATASET = 'newfacade%2FLeetCodeDataset';

export const fetchRows = async (offset = 0, limit = 100) => {
    const url = `${BASE_URL}?dataset=${DATASET}&config=default&split=train&offset=${offset}&limit=${limit}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            throw new AppError(`HuggingFace API error: ${response.status} ${response.statusText}`, 502);
        }

        const data = await response.json();
        const rows = data.rows || [];
        const total = data.num_rows_total || 2641;
        
        logger.info(`Fetched rows ${offset}-${offset + rows.length} of ${total}`);
        return { rows, total };
    } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
            throw new AppError('HuggingFace API timeout after 30 seconds', 504);
        }
        throw new AppError(`Failed to fetch from HuggingFace API: ${error.message}`, 502);
    }
};

export const fetchAllRows = async (limit = 2641, onProgress = null) => {
    let collected = 0;
    const allRows = [];
    const batchSize = 100;
    let offset = 0;

    while (collected < limit) {
        const fetchLimit = Math.min(batchSize, limit - collected);
        const { rows, total } = await fetchRows(offset, fetchLimit);
        
        if (rows.length === 0) break;

        for (const r of rows) {
            allRows.push(r.row);
        }
        
        collected += rows.length;
        offset += rows.length;
        const totalTarget = Math.min(limit, total);

        if (onProgress) {
            onProgress(collected, totalTarget);
        } else {
            logger.info(`Progress: ${collected}/${totalTarget} rows`);
        }

        if (offset >= total) break;
    }

    return allRows;
};

export const fetchSplit = async (split = 'test', offset = 0, limit = 100) => {
    const url = `${BASE_URL}?dataset=${DATASET}&config=default&split=${split}&offset=${offset}&limit=${limit}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            throw new AppError(`HuggingFace API error: ${response.status} ${response.statusText}`, 502);
        }

        const data = await response.json();
        return { rows: data.rows || [], total: data.num_rows_total || 228 };
    } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
            throw new AppError('HuggingFace API timeout after 30 seconds', 504);
        }
        throw new AppError(`Failed to fetch from HuggingFace API: ${error.message}`, 502);
    }
};
