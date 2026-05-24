const fs = require('fs');
const path = require('path');
const dns = require('dns');
const logger = require('../config/logger');
const { isSupportedAudioMimeType, MAX_AUDIO_FILE_SIZE, normalizeMime } = require('../utils/audio-utils');
const { retryWithBackoff } = require('../utils/async-timeout');
const { fetchWithTimeout, classifyNetworkError } = require('../utils/network');

// Prefer IPv4 to avoid Windows DNS issues
if (typeof dns.setDefaultResultOrder === 'function') {
  try { dns.setDefaultResultOrder('ipv4first'); } catch (e) { /* best-effort */ }
}

class WhisperService {
  constructor() {
    this.hfToken = process.env.HF_TOKEN;
    this.modelId = process.env.WHISPER_MODEL_ID || 'openai/whisper-large-v3';
    this.provider = process.env.WHISPER_PROVIDER || 'hf-inference';
    this.inferenceClient = null;

    logger.info(`Whisper Token Exists: ${Boolean(this.hfToken)}`);
    logger.info(`Whisper Model ID: ${this.modelId}`);
    logger.info(`Whisper Provider: ${this.provider}`);
  }

  /**
   * Transcribes an audio file using HuggingFace Inference API with OpenAI Whisper
   * @param {string} audioFilePath Path to the temporary audio file
   * @returns {Promise<string>} Transcribed text
   */
  async transcribeAudio(audioFilePath, mimeType = 'application/octet-stream') {
    // TODO: Add streaming transcription.
    // TODO: Add real-time Whisper transcription.
    // TODO: Add audio compression.
    try {
      const resolvedPath = path.resolve(audioFilePath);
      logger.info(`Whisper transcription requested for ${resolvedPath} with mime type ${mimeType}`);

      if (!fs.existsSync(resolvedPath)) {
        throw this.createTranscriptionError('Audio file not found', {
          audioFilePath: resolvedPath,
          mimeType,
        }, 500);
      }

      const fileStats = fs.statSync(resolvedPath);
      if (!fileStats.size) {
        throw this.createTranscriptionError('Uploaded audio file is empty', {
          audioFilePath: resolvedPath,
          mimeType,
          fileSize: fileStats.size,
        }, 400);
      }

      if (fileStats.size > MAX_AUDIO_FILE_SIZE) {
        throw this.createTranscriptionError('Uploaded audio file is too large', {
          audioFilePath: resolvedPath,
          mimeType,
          fileSize: fileStats.size,
          maxSize: MAX_AUDIO_FILE_SIZE,
        }, 413);
      }

      if (!isSupportedAudioMimeType(mimeType)) {
        throw this.createTranscriptionError('Unsupported audio mime type', {
          audioFilePath: resolvedPath,
          mimeType,
          fileSize: fileStats.size,
        }, 415);
      }

      const fileData = fs.readFileSync(resolvedPath);
      const attempts = [];
      console.log('Starting Whisper transcription...');
      console.log('File Path:', resolvedPath);

      if (!this.hfToken) {
        throw this.createTranscriptionError('HF_TOKEN is missing. Whisper cannot be initialized.', {
          provider: 'huggingface',
          modelId: this.modelId,
          audioFilePath: resolvedPath,
        }, 500);
      }

      let huggingFaceTranscript = null;
      const maxRetries = Number(process.env.WHISPER_MAX_RETRIES || process.env.WHISPER_MAX_RETRIES || 2);
      const timeoutMs = Number(process.env.WHISPER_TIMEOUT_MS || 20000);

      await retryWithBackoff(
        async (attempt) => {
          try {
            const url = `https://api-inference.huggingface.co/models/${this.modelId}`;
            const normalizedMime = normalizeMime(mimeType) || 'audio/webm';
            const headers = {
              Authorization: `Bearer ${this.hfToken}`,
              'Content-Type': normalizedMime,
            };

            const { body, contentType } = await fetchWithTimeout(url, {
              method: 'POST',
              headers,
              body: Buffer.isBuffer(fileData) ? fileData : Buffer.from(fileData || []),
              timeoutMs,
              retries: 0,
            });

            // body may be ArrayBuffer or parsed JSON
            let parsed = null;
            if (contentType && contentType.includes('application/json')) {
              parsed = body;
            } else if (body instanceof ArrayBuffer || body?.buffer) {
              // Not JSON - treat as text
              try {
                const text = Buffer.from(body).toString('utf8');
                parsed = { text };
              } catch (e) {
                parsed = { text: '' };
              }
            } else {
              parsed = { text: '' };
            }

            huggingFaceTranscript = parsed;
            logger.info(`Whisper Response (Attempt ${attempt}) preview: ${(parsed.text || '').slice(0,200)}`);
            return huggingFaceTranscript;
          } catch (error) {
            attempts.push({
              provider: 'huggingface',
              attempt,
              message: error.message,
              stack: error.stack,
              details: error.details,
              code: error.code,
            });

            const net = classifyNetworkError(error);
            logger.warn(`Whisper transcription attempt ${attempt} failed (${net.category}): ${error.message}`);
            throw error;
          }
        },
        {
          retries: maxRetries,
          minDelayMs: 1200,
          maxDelayMs: 5000,
          factor: 2,
          onRetry: (error, attempt) => {
            logger.warn(`Whisper transcription retrying after attempt ${attempt}: ${error.message}`);
          },
        }
      );

      if (!huggingFaceTranscript) {
        const details = {
          modelId: this.modelId,
          audioFilePath: resolvedPath,
          mimeType,
          fileSize: fileStats.size,
          endpointAttempts: attempts,
        };

        logger.error(`Whisper Transcription Error: ${JSON.stringify(details)}`);
        console.error('Whisper Transcription Error:', details);
        throw this.createTranscriptionError('Speech-to-text processing failed after retries', details, 500);
      }

      const transcriptText = huggingFaceTranscript?.text?.trim?.() || '';
      if (!transcriptText) {
        throw this.createTranscriptionError('Whisper returned empty transcription', {
          provider: 'huggingface',
          response: huggingFaceTranscript,
        }, 500);
      }

      if (transcriptText.length < 2) {
        throw this.createTranscriptionError('Whisper transcription is too short', {
          provider: 'huggingface',
          transcriptPreview: transcriptText,
        }, 422);
      }

      return transcriptText;
    } catch (error) {
      if (error.details) {
        throw error;
      }

      logger.error(`Whisper Transcription Error: ${error.message}`);
      console.error('Whisper Transcription Error:', error);
      throw this.createTranscriptionError('Speech-to-text processing failed', {
        message: error.message,
        stack: error.stack,
        code: error.code,
      }, 500);
    }
  }

  createTranscriptionError(message, details = {}, statusCode = 500) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.details = details;
    return error;
  }

  async getInferenceClient() {
    // Legacy SDK-based client removed in favor of direct fetch to improve
    // stability and DNS/fetch behavior across platforms. Kept for API
    // compatibility in case other modules call it.
    throw this.createTranscriptionError('Inference client removed; use direct fetch', { provider: 'huggingface' }, 500);
  }

  async transcribeWithHuggingFace(fileData, mimeType) {
    logger.info('[Whisper] Attempting Whisper transcription via Hugging Face Inference');
    logger.info(`[Whisper] Mime type: ${mimeType}`);

    const normalizedMime = require('../utils/audio-utils').normalizeMime(mimeType);
    const safeMime = normalizedMime || 'audio/webm';

    logger.info('[Whisper] Preparing request body');

    // Ensure fileData is a Buffer or Uint8Array
    const bodyBuffer = Buffer.isBuffer(fileData) ? fileData : Buffer.from(fileData || []);

    const url = `https://api-inference.huggingface.co/models/${this.modelId}`;
    const headers = {
      Authorization: `Bearer ${this.hfToken}`,
      'Content-Type': safeMime,
    };

    logger.info('[Whisper] Sending request to HF', { url, mime: safeMime, provider: this.provider });

    try {
      const fetchPromise = async () => {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: bodyBuffer,
        });

        const contentType = res.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');

        const text = await res.text();

        if (!res.ok) {
          let parsed;
          try { parsed = JSON.parse(text); } catch (e) { parsed = { message: text }; }
          const message = parsed?.error || parsed?.message || `HF inference failed with status ${res.status}`;
          const err = new Error(message);
          err.statusCode = res.status;
          err.details = { providerResponse: parsed };
          throw err;
        }

        // parse success
        try {
          const parsed = isJson ? JSON.parse(text) : { text };
          logger.info('[Whisper] Transcription response received', { preview: (parsed.text || text || '').slice(0, 200) });
          return parsed;
        } catch (err) {
          const e = new Error('Failed to parse HF response');
          e.details = { raw: text };
          throw e;
        }
      };

      const timeoutMs = Number(process.env.WHISPER_TIMEOUT_MS || 20000);
      const result = await withTimeout(fetchPromise(), { timeoutMs, timeoutMessage: 'HF transcription timed out' });
      logger.info('[Whisper] Transcription successful');
      return result;
    } catch (error) {
      logger.warn(`[Whisper] HF transcription error: ${error.message}`);
      throw error;
    }
  }

  normalizeProviderError(error, context = {}) {
    const message = String(error?.message || 'Whisper request failed');
    const statusCode = error?.statusCode || error?.status || 500;
    const lower = message.toLowerCase();
    let category = 'provider_failure';

    if (lower.includes('unauthorized') || lower.includes('forbidden') || statusCode === 401 || statusCode === 403) {
      category = 'auth_failure';
    } else if (lower.includes('rate') || statusCode === 429) {
      category = 'rate_limited';
    } else if (lower.includes('timeout') || error?.code === 'TIMEOUT') {
      category = 'timeout';
    }

    return {
      category,
      message,
      statusCode,
      ...context,
    };
  }
}

module.exports = new WhisperService();
