import fs from 'fs';
import path from 'path';
import logger from '../config/logger.js';

class HuggingFaceWhisperService {
  constructor() {
    this.hfToken = process.env.HF_TOKEN;
    this.modelUrl = 'https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3-turbo';
    logger.info(`[HF Whisper] Service initialized. Token Exists: ${Boolean(this.hfToken)}`);
  }

  /**
   * Transcribes an audio file by uploading the raw binary buffer directly to the HuggingFace Inference Router
   * @param {string} filePath Path to local audio file (usually WebM or preprocessed WAV)
   * @param {string} mimeType Audio mime type (e.g. audio/wav or audio/webm)
   * @returns {Promise<{text: string, provider: string, confidence: number|null}>}
   */
  async transcribeAudio(filePath, mimeType = 'audio/wav') {
    if (!this.hfToken) {
      throw new Error('HF_TOKEN is missing. HuggingFace Whisper cannot be initialized.');
    }

    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Audio file not found: ${resolvedPath}`);
    }

    // Read the raw binary audio buffer directly from the local file
    const audioBuffer = fs.readFileSync(resolvedPath);

    logger.info(`[HF Whisper] Sending raw binary audio buffer (${audioBuffer.length} bytes) to HuggingFace Router...`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000); // 10 seconds strict timeout

    try {
      const response = await fetch(this.modelUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.hfToken}`,
          'Content-Type': mimeType || 'audio/wav',
        },
        body: audioBuffer, // Send raw binary buffer directly as the request body
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HuggingFace STT failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      logger.info(`[HF Whisper] Transcription result received: "${(result.text || '').slice(0, 160)}..."`);

      return {
        text: result.text || '',
        provider: 'huggingface',
        confidence: result.confidence || null,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        const timeoutErr = new Error('HuggingFace transcription timed out');
        timeoutErr.code = 'ETIMEDOUT';
        throw timeoutErr;
      }
      logger.error(`[HF Whisper] Error during raw binary transcription: ${error.message}`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

export default new HuggingFaceWhisperService();
