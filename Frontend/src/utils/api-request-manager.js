/**
 * Frontend API Request Management
 * 
 * Purpose:
 * - Centralized retry logic with exponential backoff
 * - Circuit breaker pattern to prevent cascading failures
 * - Request deduplication to prevent duplicate requests
 * - Error recovery with suggestions
 * - 404 error handling with route suggestions
 */

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10000; // 10 seconds
const CIRCUIT_BREAKER_THRESHOLD = 5; // Failures before circuit opens
const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds before attempting recovery

// Track request states
const requestTracker = new Map();
const circuitBreakerMap = new Map();
const requestDeduplicator = new Map();

/**
 * Get or create circuit breaker for an endpoint
 */
const getCircuitBreaker = (key) => {
  if (!circuitBreakerMap.has(key)) {
    circuitBreakerMap.set(key, {
      failureCount: 0,
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      lastFailureTime: null,
      successCount: 0
    });
  }
  return circuitBreakerMap.get(key);
};

/**
 * Check if circuit breaker allows request
 */
const canAttemptRequest = (key) => {
  const breaker = getCircuitBreaker(key);

  // If closed, always allow
  if (breaker.state === 'CLOSED') {
    return true;
  }

  // If open, check if timeout has passed
  if (breaker.state === 'OPEN') {
    const timeSinceFailure = Date.now() - breaker.lastFailureTime;
    if (timeSinceFailure > CIRCUIT_BREAKER_TIMEOUT) {
      breaker.state = 'HALF_OPEN';
      console.log(`[Circuit Breaker] ${key} entering HALF_OPEN state`);
      return true;
    }
    return false;
  }

  // If half-open, allow single attempt
  if (breaker.state === 'HALF_OPEN') {
    return true;
  }

  return false;
};

/**
 * Record successful request
 */
const recordSuccess = (key) => {
  const breaker = getCircuitBreaker(key);
  breaker.failureCount = 0;

  if (breaker.state === 'HALF_OPEN') {
    breaker.state = 'CLOSED';
    breaker.successCount = 0;
    console.log(`[Circuit Breaker] ${key} recovered to CLOSED state`);
  }
};

/**
 * Record failed request
 */
const recordFailure = (key) => {
  const breaker = getCircuitBreaker(key);
  breaker.failureCount += 1;
  breaker.lastFailureTime = Date.now();

  if (breaker.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
    breaker.state = 'OPEN';
    console.error(`[Circuit Breaker] ${key} opened after ${breaker.failureCount} failures`);
  }
};

/**
 * Calculate exponential backoff delay
 */
const getRetryDelay = (attemptNumber) => {
  const delay = BASE_RETRY_DELAY * Math.pow(2, attemptNumber);
  return Math.min(delay, MAX_RETRY_DELAY);
};

/**
 * Check if request should be retried
 */
const shouldRetry = (error, attemptNumber) => {
  if (attemptNumber >= MAX_RETRIES) {
    return false;
  }

  // Don't retry 404s, 401s, 403s, or 400s
  const status = error?.response?.status;
  if (status && [400, 401, 403, 404].includes(status)) {
    return false;
  }

  // Retry on network errors and 5xx errors
  const isNetworkError = !error?.response;
  const isServerError = status && status >= 500;
  const isRateLimit = status === 429;

  return isNetworkError || isServerError || isRateLimit;
};

/**
 * Deduplicate identical requests in-flight
 */
const getDuplicateRequest = (method, url, data) => {
  const key = `${method}:${url}:${JSON.stringify(data || {})}`;
  return requestDeduplicator.get(key);
};

const trackRequest = (method, url, data, promise) => {
  const key = `${method}:${url}:${JSON.stringify(data || {})}`;
  requestDeduplicator.set(key, promise);

  // Clean up after request completes
  promise.finally(() => {
    requestDeduplicator.delete(key);
  });

  return promise;
};

/**
 * Generate error suggestion based on response status
 */
const getErrorSuggestion = (error) => {
  const status = error?.response?.status;
  const path = error?.config?.url;

  if (status === 404) {
    return {
      issue: 'Endpoint not found',
      message: 'Check /health/routes for available endpoints',
      url: '/health/routes'
    };
  }

  if (status === 401) {
    return {
      issue: 'Unauthorized',
      message: 'Your session has expired. Please log in again.'
    };
  }

  if (status === 403) {
    return {
      issue: 'Forbidden',
      message: 'You do not have permission to access this resource.'
    };
  }

  if (status === 429) {
    return {
      issue: 'Too many requests',
      message: 'Rate limit exceeded. Please wait before trying again.'
    };
  }

  if (status >= 500) {
    return {
      issue: 'Server error',
      message: 'The server encountered an error. Please try again later.',
      status
    };
  }

  if (!error?.response) {
    return {
      issue: 'Network error',
      message: 'Failed to reach the server. Check your internet connection.'
    };
  }

  return null;
};

/**
 * Main retry function
 */
const retryWithBackoff = async (axiosRequest, context = {}) => {
  const { method = 'GET', url = '', data = null } = context;
  const key = `${method}:${url}`;

  // Check if request is already in-flight
  const existingRequest = getDuplicateRequest(method, url, data);
  if (existingRequest) {
    console.log(`[Request Deduplication] Returning existing request for ${key}`);
    return existingRequest;
  }

  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Check circuit breaker
    if (!canAttemptRequest(key)) {
      const breaker = getCircuitBreaker(key);
      const error = new Error(`Circuit breaker is ${breaker.state} for ${key}`);
      error.isCircuitBreakerOpen = true;
      throw error;
    }

    try {
      const promise = axiosRequest();
      const tracked = trackRequest(method, url, data, promise);
      const response = await tracked;

      recordSuccess(key);
      return response;
    } catch (error) {
      lastError = error;
      recordFailure(key);

      if (!shouldRetry(error, attempt)) {
        // Don't retry, throw immediately
        throw error;
      }

      // Calculate delay for next attempt
      const delay = getRetryDelay(attempt);
      console.warn(
        `[Retry ${attempt + 1}/${MAX_RETRIES}] ${method} ${url} failed. ` +
        `Retrying in ${delay}ms. Error: ${error?.message}`
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Reset circuit breaker for testing/recovery
 */
const resetCircuitBreaker = (key) => {
  circuitBreakerMap.delete(key);
};

const resetAllCircuitBreakers = () => {
  circuitBreakerMap.clear();
};

/**
 * Get circuit breaker status
 */
const getCircuitBreakerStatus = () => {
  const status = {};
  circuitBreakerMap.forEach((breaker, key) => {
    status[key] = {
      state: breaker.state,
      failureCount: breaker.failureCount,
      lastFailureTime: breaker.lastFailureTime
    };
  });
  return status;
};

export {
  retryWithBackoff,
  getErrorSuggestion,
  shouldRetry,
  getRetryDelay,
  canAttemptRequest,
  recordSuccess,
  recordFailure,
  resetCircuitBreaker,
  resetAllCircuitBreakers,
  getCircuitBreakerStatus
};
