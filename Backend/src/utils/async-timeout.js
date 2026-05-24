const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = (promise, { timeoutMs, timeoutMessage, errorFactory } = {}) => {
  if (!timeoutMs || timeoutMs <= 0) {
    return promise;
  }

  let timerId;
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      if (typeof errorFactory === 'function') {
        return reject(errorFactory());
      }
      const error = new Error(timeoutMessage || 'Operation timed out');
      error.code = 'TIMEOUT';
      return reject(error);
    }, timeoutMs);
  });

  return Promise.race([promise.finally(() => clearTimeout(timerId)), timeoutPromise]);
};

const retryWithBackoff = async (fn, options = {}) => {
  const {
    retries = 2,
    minDelayMs = 500,
    maxDelayMs = 5000,
    factor = 2,
    onRetry,
  } = options;

  let attempt = 0;
  let delay = minDelayMs;

  while (attempt <= retries) {
    try {
      return await fn(attempt + 1);
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }

      if (typeof onRetry === 'function') {
        onRetry(error, attempt + 1);
      }

      await sleep(Math.min(delay, maxDelayMs));
      delay *= factor;
      attempt += 1;
    }
  }

  return null;
};

module.exports = {
  sleep,
  withTimeout,
  retryWithBackoff,
};
