import { decryptId } from '../utils/id-obfuscator.js';

/**
 * Express middleware to automatically decrypt encrypted parameter keys
 * back to raw MongoDB ObjectIds before the controller processes them.
 * 
 * @param {Array<string>} paramNames - List of parameter keys to decrypt (e.g. ['jobId', 'candidateId'])
 */
export const decryptParams = (paramNames = []) => (req, res, next) => {
  for (const name of paramNames) {
    if (req.params[name]) {
      const encryptedValue = req.params[name];
      const rawId = decryptId(encryptedValue);
      
      if (!rawId) {
        return res.status(400).json({
          success: false,
          message: `Insecure direct object reference validation failed. Tampered or invalid resource key: ${name}`
        });
      }
      
      // Mutate back to raw ObjectId so standard controller logic performs transparently
      req.params[name] = rawId;
    }
  }
  next();
};

export default decryptParams;
