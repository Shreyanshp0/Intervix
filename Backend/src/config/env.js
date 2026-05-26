const toBool = (v, defaultVal = false) => {
  if (v === undefined || v === null) return defaultVal;
  if (typeof v === 'boolean') return v;
  return String(v).toLowerCase() === 'true';
};

export default {
  ENABLE_TTS: toBool(process.env.ENABLE_TTS, true),
  WHISPER_TIMEOUT_MS: Number(process.env.WHISPER_TIMEOUT_MS || 20000),
  WHISPER_MAX_RETRIES: Number(process.env.WHISPER_MAX_RETRIES || 2),
  KOKORO_TIMEOUT_MS: Number(process.env.KOKORO_TIMEOUT_MS || 20000),
  KOKORO_MAX_RETRIES: Number(process.env.KOKORO_MAX_RETRIES || 1),
  NETWORK_DEFAULT_TIMEOUT_MS: Number(process.env.NETWORK_DEFAULT_TIMEOUT_MS || 20000),
};
