const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

class WhisperService {
  constructor() {
    this.hfToken = process.env.HF_TOKEN;
    this.modelId = process.env.WHISPER_MODEL_ID || 'openai/whisper-large-v3';
    this.inferenceClient = null;

    logger.info(`Whisper Token Exists: ${Boolean(this.hfToken)}`);
    logger.info(`Whisper Model ID: ${this.modelId}`);
  }

  /**
   * Transcribes an audio file using HuggingFace Inference API with OpenAI Whisper
   * @param {string} audioFilePath Path to the temporary audio file
   * @returns {Promise<string>} Transcribed text
   */
  async transcribeAudio(audioFilePath, mimeType = 'application/octet-stream') {
    // TODO: Add streaming transcription.
    // TODO: Add real-time Whisper transcription.
    // TODO: Add retry mechanism for failed uploads.
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

      try {
        const huggingFaceTranscript = await this.transcribeWithHuggingFace(fileData, mimeType);
        console.log('Whisper Response:', huggingFaceTranscript);

        const transcriptText = huggingFaceTranscript?.text?.trim?.() || '';
        if (!transcriptText) {
          throw this.createTranscriptionError('Whisper returned empty transcription', {
            provider: 'huggingface',
            response: huggingFaceTranscript,
          }, 500);
        }

        return transcriptText;
      } catch (error) {
        attempts.push({
          provider: 'huggingface',
          message: error.message,
          stack: error.stack,
          details: error.details,
        });
      }

      const details = {
        modelId: this.modelId,
        audioFilePath: resolvedPath,
        mimeType,
        fileSize: fileStats.size,
        endpointAttempts: attempts,
      };

      logger.error(`Whisper Transcription Error: ${JSON.stringify(details)}`);
      console.error('Whisper Transcription Error:', details);
      throw this.createTranscriptionError('Speech-to-text processing failed', details, 500);
    } catch (error) {
      if (error.details) {
        throw error;
      }

      logger.error(`Whisper Transcription Error: ${error.message}`);
      console.error('Whisper Transcription Error:', error);
      throw this.createTranscriptionError('Speech-to-text processing failed', {
        message: error.message,
        stack: error.stack,
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
    if (this.inferenceClient) {
      return this.inferenceClient;
    }

    try {
      const { InferenceClient } = await import('@huggingface/inference');
      this.inferenceClient = new InferenceClient(this.hfToken);
      return this.inferenceClient;
    } catch (error) {
      throw this.createTranscriptionError('Failed to load @huggingface/inference', {
        provider: 'huggingface',
        message: error.message,
      }, 500);
    }
  }

  async transcribeWithHuggingFace(fileData, mimeType) {
    logger.info('Attempting Whisper transcription via Hugging Face InferenceClient');
    logger.info(`Whisper mime type: ${mimeType}`);

    const client = await this.getInferenceClient();
    const output = await client.automaticSpeechRecognition({
      data: fileData,
      model: this.modelId,
      provider: 'hf-inference',
    });

    return output;
  }
}

module.exports = new WhisperService();
