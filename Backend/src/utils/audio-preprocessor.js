import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import logger from '../config/logger.js';

class AudioPreprocessor {
  constructor() {
    this.hasFfmpeg = false;
    this.probeFfmpeg();
  }

  /**
   * Probes the environment to see if FFmpeg is installed and accessible in system path.
   */
  probeFfmpeg() {
    try {
      // Execute simple version query to confirm binary access
      execSync('ffmpeg -version', { stdio: 'ignore' });
      this.hasFfmpeg = true;
      logger.info('[Audio Preprocessor] FFmpeg is successfully detected on the host system. Audio preprocessing pipeline is fully ACTIVE.');
    } catch (err) {
      this.hasFfmpeg = false;
      logger.warn('[Audio Preprocessor] FFmpeg is NOT detected in PATH. Audio WebM conversion and normalization will be bypassed. Passing raw WebM directly.');
    }
  }

  /**
   * Preprocesses audio file: Converts WebM to 16kHz mono WAV PCM and normalizes volume via loudnorm.
   * If FFmpeg is missing, returns the original path directly (graceful fallback).
   * 
   * @param {string} inputPath Path to original uploaded audio file (usually WebM)
   * @returns {Promise<string>} Path to preprocessed WAV file or original input file
   */
  async preprocess(inputPath) {
    if (!this.hasFfmpeg) {
      return inputPath;
    }

    const resolvedInput = path.resolve(inputPath);
    if (!fs.existsSync(resolvedInput)) {
      logger.error(`[Audio Preprocessor] Input audio file not found: ${resolvedInput}`);
      return inputPath;
    }

    // Determine output file paths
    const baseName = resolvedInput.replace(/\.[^/.]+$/, "");
    const tempWavPath = `${baseName}_temp.wav`;
    const finalWavPath = `${baseName}_preprocessed.wav`;

    try {
      logger.info(`[Audio Preprocessor] Commencing preprocessing on: ${path.basename(resolvedInput)}`);

      // 1. Convert WebM to 16kHz mono WAV PCM
      const convertCmd = `ffmpeg -y -i "${resolvedInput}" -ac 1 -ar 16000 "${tempWavPath}"`;
      logger.info(`[Audio Preprocessor] Converting WebM to mono 16kHz WAV: ${convertCmd}`);
      execSync(convertCmd, { stdio: 'ignore' });

      // Check intermediate file
      if (!fs.existsSync(tempWavPath) || fs.statSync(tempWavPath).size === 0) {
        throw new Error('FFmpeg WebM-to-WAV conversion yielded an empty file.');
      }

      // 2. Normalize volume levels using loudnorm filter
      const normalizeCmd = `ffmpeg -y -i "${tempWavPath}" -af loudnorm "${finalWavPath}"`;
      logger.info(`[Audio Preprocessor] Normalizing audio via loudnorm: ${normalizeCmd}`);
      execSync(normalizeCmd, { stdio: 'ignore' });

      // Clean up intermediate temp WAV file
      this.safeDelete(tempWavPath);

      // Verify normalized file
      if (fs.existsSync(finalWavPath) && fs.statSync(finalWavPath).size > 0) {
        logger.info(`[Audio Preprocessor] Preprocessing completed successfully. Output: ${path.basename(finalWavPath)}`);
        return finalWavPath;
      }

      throw new Error('FFmpeg normalization yielded an empty final preprocessed file.');
    } catch (error) {
      logger.error(`[Audio Preprocessor] Preprocessing failed: ${error.message}. Falling back to original WebM file.`);
      
      // Clean up any remaining temp preprocessed files
      this.safeDelete(tempWavPath);
      this.safeDelete(finalWavPath);
      
      return resolvedInput;
    }
  }

  /**
   * Helper to safely delete local temporary files
   */
  safeDelete(filePath) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      logger.warn(`[Audio Preprocessor] Temporary file cleanup failed for ${filePath}: ${err.message}`);
    }
  }
}

export default new AudioPreprocessor();
