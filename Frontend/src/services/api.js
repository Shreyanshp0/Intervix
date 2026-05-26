import axios from 'axios';
import { getApiOrigin } from '../constants/apiRoutes';
import { recordDiagnostic } from '../utils/diagnostics';

const apiBaseUrl = getApiOrigin();

// Configure the base instance
const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const maxRetries = 3;
const retryCounts = new Map();

// Request interceptor to attach JWT token and prevent request loops
api.interceptors.request.use(
  (config) => {
    const key = `${config.method}:${config.url}`;
    config.metadata = { startedAt: performance.now(), routeKey: key };
    const count = retryCounts.get(key) || 0;
    if (count >= maxRetries) {
      console.error(`[API_SAFEGUARD] Request blocked by circuit-breaker due to consecutive failures: ${key}`);
      recordDiagnostic('ROUTING', { level: 'error', message: 'Request blocked by circuit breaker', key });
      return Promise.reject(new Error('MAX_RETRIES_EXCEEDED'));
    }

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401s and track request failures for circuit-breaker
api.interceptors.response.use(
  (response) => {
    if (response.config) {
      const key = `${response.config.method}:${response.config.url}`;
      retryCounts.delete(key); // Reset counter on success
      recordDiagnostic('ROUTING', {
        key,
        status: response.status,
        durationMs: Math.round(performance.now() - (response.config.metadata?.startedAt || performance.now()))
      });
    }
    return response;
  },
  (error) => {
    if (error.config) {
      const key = `${error.config.method}:${error.config.url}`;
      const count = retryCounts.get(key) || 0;
      retryCounts.set(key, count + 1);
      recordDiagnostic('ROUTING', {
        level: 'error',
        key,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        durationMs: Math.round(performance.now() - (error.config.metadata?.startedAt || performance.now()))
      });
    }

    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
