const fs = require('fs');
const path = require('path');
const dns = require('dns');
const crypto = require('crypto');
const logger = require('../config/logger');
const { retryWithBackoff, withTimeout } = require('../utils/async-timeout');
const env = require('../config/env');

// Prefer IPv4 resolution where possible
if (typeof dns.setDefaultResultOrder === 'function') {
  try { dns.setDefaultResultOrder('ipv4first'); } catch (e) { /* best-effort */ }
}

class KokoroService {
  constructor() {
    this.hfToken = process.env.HF_TOKEN;
    this.modelId = process.env.KOKORO_MODEL_ID || 'hexgrad/Kokoro-82M';
    this.provider = process.env.KOKORO_PROVIDER || 'fal-ai';
    this.inferenceClient = null;
    this.uploadsDir = path.join(__dirname, '../../uploads/audio');

    console.log('Initializing Kokoro model...');
    logger.info(`Kokoro Token Exists: ${Boolean(this.hfToken)}`);
    logger.info(`Kokoro Model ID: ${this.modelId}`);
    logger.info(`Kokoro Provider: ${this.provider}`);
    console.log('Kokoro model loaded successfully');
  }

  /**
   * Generates audio from text using Kokoro-82M
   * @param {string} text The text to convert to speech
   * @returns {Promise<string>} The path to the saved audio file or a base64 string
   */
  ensureAudioDirectory() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  resolveFileExtension(contentType = '') {
    if (contentType.includes('mpeg') || contentType.includes('mp3')) {
      return 'mp3';
    }
    if (contentType.includes('wav') || contentType.includes('wave')) {
      return 'wav';
    }
    if (contentType.includes('flac')) {
      return 'flac';
    }
    if (contentType.includes('ogg')) {
      return 'ogg';
    }
    return 'wav';
  }

  resolveMimeTypeFromFileName(fileName = '') {
    const extension = path.extname(fileName).replace('.', '').toLowerCase();
    if (extension === 'mp3') return 'audio/mpeg';
    if (extension === 'ogg') return 'audio/ogg';
    if (extension === 'flac') return 'audio/flac';
    return 'audio/wav';
  }

  createTtsError(message, details = {}, statusCode = 500) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.details = details;
    return error;
  }

  async getInferenceClient() {
    if (this.inferenceClient) {
      return this.inferenceClient;
    }

    try {
      const { InferenceClient } = await import('@huggingface/inference');
      this.inferenceClient = new InferenceClient(this.hfToken);
      return this.inferenceClient;
    } catch (error) {
      throw this.createTtsError('Failed to load @huggingface/inference', {
        provider: this.provider,
        message: error.message,
      }, 500);
    }
  }

  async generateSpeech(text, fileNamePrefix = `response_${Date.now()}`) {
    // TODO: Add streaming audio generation.
    // TODO: Add voice selection support.
    console.log('TTS Input Text:', text);

    if (!text || typeof text !== 'string' || !text.trim()) {
      throw this.createTtsError('Text is required for speech generation', {
        reason: 'empty_text',
      }, 400);
    }

    // Feature flag: allow deployments to disable TTS to avoid billing/credit issues
    if (!env.ENABLE_TTS) {
      logger.info('TTS disabled via ENABLE_TTS=false; skipping Kokoro generation');
      return null;
    }

    if (!this.hfToken) {
      throw this.createTtsError('HF_TOKEN is missing. Kokoro TTS cannot be initialized.', {
        reason: 'missing_hf_token',
        modelId: this.modelId,
      }, 500);
    }

    this.ensureAudioDirectory();
    const maxRetries = Number(process.env.KOKORO_MAX_RETRIES || 1);
    const timeoutMs = Number(process.env.KOKORO_TIMEOUT_MS || 20000);
    try {
      const cacheKey = crypto.createHash('sha1').update(text.trim()).digest('hex');
      const existingAudio = fs.readdirSync(this.uploadsDir).find((file) => file.startsWith(cacheKey));
      if (existingAudio) {
        return {
          audioUrl: `/uploads/audio/${existingAudio}`,
          mimeType: this.resolveMimeTypeFromFileName(existingAudio),
          fallback: false,
          provider: this.provider,
          cached: true,
        };
      }

      logger.info(`Attempting Kokoro TTS via Hugging Face InferenceClient using provider ${this.provider}`);
      const client = await this.getInferenceClient();
      let audio;

      await retryWithBackoff(
        async (attempt) => {
          audio = await withTimeout(
            client.textToSpeech({
              provider: this.provider,
              model: this.modelId,
              inputs: text.trim(),
            }),
            {
              timeoutMs,
              timeoutMessage: 'Kokoro TTS timed out',
            }
          );
          return audio;
        },
        {
          retries: maxRetries,
          minDelayMs: 1000,
          maxDelayMs: 5000,
          factor: 2,
          onRetry: (error, attempt) => {
            logger.warn(`Kokoro TTS retrying after attempt ${attempt}: ${error.message}`);
          },
        }
      );

      const contentType = audio?.type || 'audio/wav';
      const fileExtension = this.resolveFileExtension(contentType);
      const safePrefix = fileNamePrefix.startsWith('aud_') ? fileNamePrefix : cacheKey;
      const fileName = `${safePrefix}.${fileExtension}`;
      const filePath = path.join(this.uploadsDir, fileName);
      const audioBuffer = Buffer.from(await audio.arrayBuffer());

      const generatedAudio = {
        contentType,
        size: audioBuffer.length,
        provider: this.provider,
      };
      console.log('Generated Audio:', generatedAudio);

      if (!audioBuffer.length) {
        throw this.createTtsError('Kokoro returned empty audio data', {
          provider: this.provider,
          modelId: this.modelId,
          textPreview: text.slice(0, 120),
        }, 500);
      }

      fs.writeFileSync(filePath, audioBuffer);

      return {
        audioUrl: `/uploads/audio/${fileName}`,
        mimeType: contentType,
        fallback: false,
        provider: this.provider,
      };
    } catch (error) {
      const normalized = this.normalizeProviderError(error);
      const details = {
        provider: this.provider,
        modelId: this.modelId,
        textPreview: text.slice(0, 120),
        message: error.message,
        stack: error.stack,
        originalDetails: error.details,
        statusCode: error.statusCode || error.status,
        category: normalized.category,
      };

      logger.error(`Kokoro TTS Error: ${JSON.stringify(details)}`);
      console.error('Kokoro TTS Error:', details);

      throw this.createTtsError('Text-to-speech processing failed', details, error.statusCode || 500);
    }
  }

  normalizeProviderError(error) {
    const message = String(error?.message || 'TTS request failed');
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
    };
  }
}

module.exports = new KokoroService();
