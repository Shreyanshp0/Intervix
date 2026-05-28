import fs from 'fs';
import path from 'path';
import logger from '../config/logger.js';
import { classifyNetworkError } from '../utils/network.js';
import audioPreprocessor from '../utils/audio-preprocessor.js';
import sttVocabCorrector from '../utils/stt-vocab-corrector.js';
import huggingFaceWhisperService from './huggingface-whisper.service.js';

class SttProviderManager {
  constructor() {
    this.cooldowns = {
      huggingface: 0,
      openai: 0,
    };
    this.cooldownDurationMs = 60 * 1000; // 1 minute cooldown on failure

    // Initialize OpenAI parameters safely
    this.openaiApiKey = process.env.OPENAI_API_KEY;

    // Technical prompt biasing string to guide OpenAI Whisper (HF uses native raw audio)
    this.vocabPrompt = 'Technical interview discussing React, MERN stack, MongoDB, Node.js, Express, JWT, WebRTC, Socket.IO, APIs, Tailwind CSS, JavaScript, software engineering, frontend and backend development.';
  }

  isProviderOnCooldown(provider) {
    const cooldownEnd = this.cooldowns[provider] || 0;
    return Date.now() < cooldownEnd;
  }

  setProviderCooldown(provider) {
    this.cooldowns[provider] = Date.now() + this.cooldownDurationMs;
    logger.warn(`[STT Manager] Provider "${provider}" placed on cooldown until ${new Date(this.cooldowns[provider]).toISOString()}`);
  }

  /**
   * Main entry point to transcribe audio file through the fallback chain
   * @param {string} filePath Path to local audio recording
   * @param {string} mimeType Original uploaded mimetype
   * @returns {Promise<{text: string, provider: string, confidence: number|null}>}
   */
  async transcribe(filePath, mimeType = 'audio/webm') {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Audio file not found: ${absolutePath}`);
    }

    const originalStats = fs.statSync(absolutePath);
    if (!originalStats.size) {
      throw new Error('Uploaded audio file is empty (0 bytes).');
    }

    let finalFilePath = absolutePath;
    let preprocessed = false;

    try {
      // 1. Run Audio Preprocessing (WAV mono conversion + Loudnorm leveling)
      finalFilePath = await audioPreprocessor.preprocess(absolutePath);
      preprocessed = (finalFilePath !== absolutePath);
      
      const fileStats = fs.statSync(finalFilePath);
      const chain = ['huggingface', 'openai'];
      let lastError = null;

      for (const provider of chain) {
        if (this.isProviderOnCooldown(provider)) {
          logger.info(`[STT Manager] Bypassing provider "${provider}" because it is on active cooldown.`);
          continue;
        }

        try {
          logger.info(`[STT Manager] Attempting transcription via "${provider}" for file: ${path.basename(finalFilePath)}`);
          
          let text = '';
          let confidence = null;

          if (provider === 'huggingface') {
            const hfResult = await huggingFaceWhisperService.transcribeAudio(finalFilePath, preprocessed ? 'audio/wav' : mimeType);
            text = hfResult.text;
            confidence = hfResult.confidence;
          } else if (provider === 'openai') {
            text = await this.transcribeWithOpenAi(finalFilePath, preprocessed ? 'audio/wav' : mimeType);
          }

          // Transcription Validation
          const rawText = (text || '').trim();
          if (!rawText) {
            throw new Error('STT provider returned an empty transcript.');
          }

          // Apply Technical Post-Processing Correction Layer
          const correctedText = sttVocabCorrector.correct(rawText);

          // Voice Activity / Hallucination Silence Detection Filter
          const lowercase = correctedText.toLowerCase();
          const fillers = new Set(['you', 'uh', 'cough', 'coughing', 'breathing', 'silence', 'laughter', 'laughter.']);
          const words = lowercase.split(/\s+/).filter(Boolean);
          // Filter single word hallucinations on short low-bitrate silent segments
          if (words.length === 1 && fillers.has(words[0]) && originalStats.size < 30000) {
            logger.info(`[STT Manager] Voice Activity VAD filtered out brief single-word hallucination: "${correctedText}"`);
            throw new Error('No intelligible speech detected. Please speak louder.');
          }

          logger.info(`[STT Manager] Transcription SUCCESS via "${provider}": "${correctedText.slice(0, 160)}..."`);
          
          return {
            text: correctedText,
            confidence: confidence || 0.95,
            provider,
          };
        } catch (err) {
          lastError = err;
          const errorCategory = classifyNetworkError(err).category || 'api_error';
          
          logger.error({
            tag: 'STT_PROVIDER_FAILURE',
            message: `Transcription attempt failed on provider "${provider}"`,
            provider,
            errorType: errorCategory,
            errorMessage: err.message,
            recoverable: true,
            fallbackActivated: true,
          });

          this.setProviderCooldown(provider);
        }
      }

      throw new Error(
        `All Speech-to-Text backend transcription providers failed. Last error: ${lastError?.message || 'Unknown failure'}`
      );
    } finally {
      // 2. Safe cleanup of preprocessed WAV temporary files
      if (preprocessed) {
        try {
          if (fs.existsSync(finalFilePath)) {
            fs.unlinkSync(finalFilePath);
            logger.info(`[STT Manager] Safely cleaned up temporary preprocessed WAV file: ${path.basename(finalFilePath)}`);
          }
        } catch (cleanupErr) {
          logger.warn(`[STT Manager] Failed to clean up temp WAV file: ${cleanupErr.message}`);
        }
      }
    }
  }

  /**
   * Transcribe via OpenAI fetch API
   */
  async transcribeWithOpenAi(filePath, mimeType) {
    if (!this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    const fileBuffer = fs.readFileSync(filePath);
    // Use native Node FormData and Blob for ultra-clean Node 24 support
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    
    // Supply extension filename so the Whisper API accepts the file correctly
    const ext = mimeType.includes('wav') ? 'audio.wav' : 'audio.webm';
    formData.append('file', blob, ext);
    formData.append('model', 'whisper-1');
    formData.append('prompt', this.vocabPrompt); // Bias OpenAI Whisper model toward developer acronyms

    logger.info('[STT Manager] Sending multipart request to OpenAI Whisper API...');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000); // 10 seconds strict timeout

    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let parsed;
        try { parsed = JSON.parse(errorText); } catch (e) { parsed = { error: { message: errorText } }; }
        const msg = parsed?.error?.message || `OpenAI failed with status code ${response.status}`;
        const err = new Error(msg);
        err.statusCode = response.status;
        throw err;
      }

      const data = await response.json();
      return data.text;
    } catch (err) {
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('OpenAI transcription timed out');
        timeoutErr.code = 'ETIMEDOUT';
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

export default new SttProviderManager();
