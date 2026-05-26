const codeExecutionService = require('../services/code-execution.service');

const runCode = async (req, res, next) => {
  try {
    const result = await codeExecutionService.runCode(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  runCode,
};
