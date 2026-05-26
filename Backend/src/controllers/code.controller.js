import codeExecutionService from '../services/code-execution.service.js';

const runCode = async (req, res, next) => {
  try {
    const result = await codeExecutionService.runCode(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export {
  runCode,
};
