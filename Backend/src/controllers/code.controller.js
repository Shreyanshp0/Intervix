import codeExecutionService from '../services/code-execution.service.js';
import handleControllerError from '../utils/controller-error.js';

const runCode = async (req, res, next) => {
  try {
    const result = await codeExecutionService.runCode(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError('code.controller.runCode', res, next, error);
  }
};

export {
  runCode,
};
