const isDev = import.meta.env.DEV;

export const safeArray = (value, label = 'array') => {
  if (Array.isArray(value)) {
    return value;
  }

  if (isDev && value !== undefined && value !== null) {
    // Best-effort warning only in development to surface contract drift.
    console.warn(`[SAFE_ARRAY] Expected array for ${label}`, value);
  }

  return [];
};

export const safeObject = (value, label = 'object') => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (isDev && value !== undefined && value !== null) {
    console.warn(`[SAFE_OBJECT] Expected object for ${label}`, value);
  }

  return {};
};

export const safeNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const safeString = (value, fallback = '') => {
  return typeof value === 'string' && value.trim() ? value : fallback;
};
