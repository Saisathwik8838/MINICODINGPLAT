import { generateForProblem, regenerateTestCases as regenerateTestCasesService } from '../services/testCaseGenerator.service.js';

export const generateTestCases = async (req, res, next) => {
    try {
        const { problemId } = req.params;
        const result = await generateForProblem(problemId);
        res.status(201).json({ status: 'success', data: result });
    } catch (error) {
        next(error);
    }
};

export const regenerateTestCases = async (req, res, next) => {
    try {
        const { problemId } = req.params;
        const result = await regenerateTestCasesService(problemId);
        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        next(error);
    }
};
