import sttProviderManager from './stt-provider-manager.js';
import logger from '../config/logger.js';

class WhisperService {
  constructor() {
    logger.info('[WhisperService] Reconfigured to execute robust STT Fallback Provider Manager pipeline.');
  }

  /**
   * Transcribes an audio file by routing it through the SttProviderManager fallback chain
   * @param {string} audioFilePath Path to the temporary audio file
   * @param {string} mimeType Mime type of the uploaded audio
   * @returns {Promise<string>} Transcribed plain text
   */
  async transcribeAudio(audioFilePath, mimeType = 'audio/webm') {
    const result = await sttProviderManager.transcribe(audioFilePath, mimeType);
    return result.text;
  }
}

export default new WhisperService();
