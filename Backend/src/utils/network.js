import dns from 'dns';
import { withTimeout, retryWithBackoff as retryBase } from './async-timeout.js';

// Prefer IPv4 on Windows where DNS resolution can return IPv6 first and cause
// issues with some providers.
if (typeof dns.setDefaultResultOrder === 'function') {
  try {
    dns.setDefaultResultOrder('ipv4first');
  } catch (e) {
    // best-effort
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchWithTimeout = async (url, opts = {}) => {
  const {
    timeoutMs = Number(process.env.NETWORK_DEFAULT_TIMEOUT_MS) || 20000,
    retries = 0,
    retryOn = ['ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'],
    ...fetchOpts
  } = opts;

  const attemptFn = async (attempt) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal, ...fetchOpts });
      clearTimeout(timer);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const err = new Error(`Fetch failed with status ${res.status}`);
        err.statusCode = res.status;
        err.body = text;
        throw err;
      }
      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const body = isJson ? await res.json().catch(async () => await res.text()) : await res.arrayBuffer();
      return { res, body, contentType };
    } catch (err) {
      if (err.name === 'AbortError') {
        const e = new Error('Request timed out');
        e.code = 'ETIMEDOUT';
        throw e;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  };

  // Simple retry wrapper
  let attempt = 0;
  let lastErr;
  const maxAttempts = Math.max(1, retries + 1);
  let delay = 500;
  while (attempt < maxAttempts) {
    try {
      return await attemptFn(attempt + 1);
    } catch (err) {
      lastErr = err;
      const code = err.code || err.statusCode || '';
      const shouldRetry = retryOn.some((r) => String(code).toUpperCase().includes(r)) || attempt < retries;
      attempt += 1;
      if (!shouldRetry || attempt >= maxAttempts) break;
      await sleep(Math.min(delay, 5000));
      delay *= 2;
    }
  }

  throw lastErr;
};

const classifyNetworkError = (error) => {
  const code = (error && (error.code || error.statusCode || '')).toString();
  if (!code) return { retryable: false, category: 'unknown' };
  const upper = code.toUpperCase();
  if (upper.includes('ENOTFOUND')) return { retryable: true, category: 'dns' };
  if (upper.includes('ETIMEDOUT') || upper.includes('TIMEOUT')) return { retryable: true, category: 'timeout' };
  if (upper.includes('ECONNRESET')) return { retryable: true, category: 'connection_reset' };
  if (Number(code) >= 500) return { retryable: true, category: 'server_error' };
  return { retryable: false, category: 'client_error' };

};

export {
  fetchWithTimeout,
  retryBase as retryWithBackoff,
  classifyNetworkError,
};
