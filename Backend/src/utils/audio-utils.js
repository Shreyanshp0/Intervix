const SUPPORTED_AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/wav',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/flac',
  'audio/m4a',
]);

const normalizeMime = (mimeType = '') => {
  const raw = String(mimeType || '').toLowerCase().trim();
  if (!raw) return '';
  return raw.split(';')[0].trim();
};

const isSupportedAudioMimeType = (mimeType = '') => {
  const normalized = normalizeMime(mimeType);
  return SUPPORTED_AUDIO_MIME_TYPES.has(normalized);
};

const MAX_AUDIO_FILE_SIZE = Number(process.env.VOICE_MAX_FILE_SIZE_BYTES || 15 * 1024 * 1024);

module.exports = {
  SUPPORTED_AUDIO_MIME_TYPES,
  isSupportedAudioMimeType,
  MAX_AUDIO_FILE_SIZE,
  normalizeMime,
};
