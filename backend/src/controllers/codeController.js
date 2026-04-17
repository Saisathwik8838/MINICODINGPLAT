const { executeCode } = require('../executor/executeCode');
const { compareOutput } = require('../utils/compareOutput');

const submitCode = async (req, res) => {
  try {
    const { language, code, input, expectedOutput } = req.body;

    if (!language || !code) {
      return res.status(400).json({
        success: false,
        output: '',
        error: 'Language and code are required fields'
      });
    }

    const result = await executeCode(language, code, input || '');

    // Integrate sophisticated string/value evaluation
    if (expectedOutput !== undefined && result.success) {
        result.passed = compareOutput(expectedOutput, result.output);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Code execution error:', error);
    return res.status(500).json({
      success: false,
      output: '',
      error: 'Internal server error during code execution'
    });
  }
};

module.exports = {
  submitCode
};
