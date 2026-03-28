import { fetchRows, fetchSplit, fetchAllRows } from '../services/leetcodeDataset.service.js';
import { normalizeAll, normalizeRow } from '../services/leetcodeNormalizer.service.js';
import { importProblems, getImportStats, previewImport as previewImportService } from '../services/leetcodeImport.service.js';

export const previewImport = async (req, res, next) => {
    try {
        const limit = req.body.limit ? Math.min(req.body.limit, 500) : 50;
        const { rows } = await fetchRows(0, limit);
        const rawRows = rows.map(r => r.row || r);
        const normalized = normalizeAll(rawRows);
        
        const preview = await previewImportService(normalized, limit);
        
        res.status(200).json({
            status: 'success',
            data: preview
        });
    } catch (e) {
        next(e);
    }
};

export const importTrain = async (req, res, next) => {
    try {
        const limit = req.body.limit ? Math.min(req.body.limit, 2641) : 100;
        const skipExisting = req.body.skipExisting !== undefined ? req.body.skipExisting : true;
        const overwrite = req.body.overwrite || false;
        
        let allRows;
        if (limit > 100) {
            allRows = await fetchAllRows(limit);
        } else {
            const { rows } = await fetchRows(0, limit);
            allRows = rows.map(r => r.row || r);
        }
        
        const normalized = normalizeAll(allRows);
        const result = await importProblems(normalized, { skipExisting, overwrite, batchSize: 50 });
        
        res.status(200).json({
            status: 'success',
            data: result
        });
    } catch (e) {
        next(e);
    }
};

export const importTest = async (req, res, next) => {
    try {
        const skipExisting = req.body.skipExisting !== undefined ? req.body.skipExisting : true;
        const overwrite = req.body.overwrite || false;
        
        const { rows } = await fetchSplit('test', 0, 228);
        const rawRows = rows.map(r => r.row || r);
        
        const normalized = normalizeAll(rawRows);
        const result = await importProblems(normalized, { skipExisting, overwrite, batchSize: 50 });
        
        res.status(200).json({
            status: 'success',
            data: result
        });
    } catch (e) {
        next(e);
    }
};

export const getStats = async (req, res, next) => {
    try {
        const stats = await getImportStats();
        res.status(200).json({
            status: 'success',
            data: stats
        });
    } catch (e) {
        next(e);
    }
};

export const importSingle = async (req, res, next) => {
    try {
        const { slug } = req.body;
        if (!slug) {
            return res.status(400).json({ status: 'fail', message: 'Slug is required' });
        }
        
        const allRows = await fetchAllRows(2641);
        const match = allRows.find(r => r.question === slug);
        
        if (!match) {
            return res.status(404).json({ status: 'fail', message: `Problem with slug ${slug} not found in dataset` });
        }
        
        const normalized = normalizeAll([match]);
        const result = await importProblems(normalized, { skipExisting: false, overwrite: true });
        
        res.status(200).json({
            status: 'success',
            data: result
        });
    } catch (e) {
        next(e);
    }
};
