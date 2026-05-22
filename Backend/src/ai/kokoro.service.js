const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

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
    // TODO: Add TTS caching system.
    // TODO: Add streaming audio generation.
    // TODO: Add voice selection support.
    // TODO: Add retry mechanism for Kokoro failures.
    console.log('TTS Input Text:', text);

    if (!text || typeof text !== 'string' || !text.trim()) {
      throw this.createTtsError('Text is required for speech generation', {
        reason: 'empty_text',
      }, 400);
    }

    if (!this.hfToken) {
      throw this.createTtsError('HF_TOKEN is missing. Kokoro TTS cannot be initialized.', {
        reason: 'missing_hf_token',
        modelId: this.modelId,
      }, 500);
    }

    this.ensureAudioDirectory();
    try {
      logger.info(`Attempting Kokoro TTS via Hugging Face InferenceClient using provider ${this.provider}`);
      const client = await this.getInferenceClient();
      const audio = await client.textToSpeech({
        provider: this.provider,
        model: this.modelId,
        inputs: text.trim(),
      });

      const contentType = audio?.type || 'audio/wav';
      const fileExtension = this.resolveFileExtension(contentType);
      const fileName = `${fileNamePrefix}.${fileExtension}`;
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
      const details = {
        provider: this.provider,
        modelId: this.modelId,
        textPreview: text.slice(0, 120),
        message: error.message,
        stack: error.stack,
        originalDetails: error.details,
      };

      logger.error(`Kokoro TTS Error: ${JSON.stringify(details)}`);
      console.error('Kokoro TTS Error:', details);

      throw this.createTtsError('Text-to-speech processing failed', details, error.statusCode || 500);
    }
  }
}

module.exports = new KokoroService();
