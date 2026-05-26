const buffer = [];
const MAX_ENTRIES = 100;

export const recordDiagnostic = (tag, payload = {}) => {
  const entry = {
    tag,
    payload,
    at: new Date().toISOString()
  };
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();

  const level = payload.level || 'info';
  const message = `[${tag}]`;
  if (level === 'error') {
    console.error(message, payload);
  } else if (level === 'warn') {
    console.warn(message, payload);
  } else {
    console.info(message, payload);
  }
};

export const getDiagnostics = () => [...buffer];

if (typeof window !== 'undefined') {
  window.__INTERVIX_DIAGNOSTICS__ = {
    record: recordDiagnostic,
    list: getDiagnostics
  };
}
