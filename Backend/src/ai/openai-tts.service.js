import fs from 'fs';
import path from 'path';
import axios from 'axios';
import crypto from 'crypto';
import logger from '../config/logger.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class OpenAiTtsService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.uploadsDir = path.join(__dirname, '../../uploads/audio');
  }

  ensureAudioDirectory() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Generates audio from text using OpenAI's TTS service
   * @param {string} text The text to convert to speech
   * @param {string} fileNamePrefix Safe name or cache hash prefix
   * @returns {Promise<object>} The generated audio metadata
   */
  async generateSpeech(text, fileNamePrefix = `openai_${Date.now()}`) {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new Error('Text is required for OpenAI TTS generation');
    }

    this.ensureAudioDirectory();
    const cacheKey = crypto.createHash('sha1').update(text.trim()).digest('hex');
    const safePrefix = fileNamePrefix.startsWith('aud_') ? fileNamePrefix : cacheKey;
    const fileName = `${safePrefix}.mp3`;
    const filePath = path.join(this.uploadsDir, fileName);

    // Serve cached file if exists
    if (fs.existsSync(filePath)) {
      return {
        audioUrl: `/uploads/audio/${fileName}`,
        mimeType: 'audio/mpeg',
        fallback: true,
        provider: 'openai',
        cached: true
      };
    }

    logger.info(`[OpenAiTTS] Sending synthesis request for: "${text.slice(0, 80)}..."`);
    const response = await axios({
      method: 'post',
      url: 'https://api.openai.com/v1/audio/speech',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      data: {
        model: 'tts-1',
        input: text.trim(),
        voice: 'alloy',
      },
      responseType: 'arraybuffer',
      timeout: 15000 // 15 seconds timeout
    });

    const audioBuffer = Buffer.from(response.data);
    if (!audioBuffer.length) {
      throw new Error('OpenAI returned empty audio stream');
    }

    fs.writeFileSync(filePath, audioBuffer);
    logger.info(`[OpenAiTTS] Successfully cached OpenAI speech file: ${fileName}`);

    return {
      audioUrl: `/uploads/audio/${fileName}`,
      mimeType: 'audio/mpeg',
      fallback: true,
      provider: 'openai',
      cached: false
    };
  }
}

export default new OpenAiTtsService();
