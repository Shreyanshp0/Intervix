const crypto = require('crypto');
const kokoroService = require('../ai/kokoro.service');
const realtimeService = require('./realtime.service');
const interviewSessionService = require('./interview-session.service');
const logger = require('../config/logger');
const { logVoiceStage, logVoiceWarning } = require('../utils/voice-pipeline-logger');

class VoiceOrchestratorService {
  createRequestId(sessionId) {
    return `aud_${sessionId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  async queueAudioForQuestion(session, question) {
    const requestId = this.createRequestId(session._id);
    logVoiceStage('tts_started', { sessionId: String(session._id), requestId });
    await interviewSessionService.updateRuntimeState(session._id, {
      aiState: 'generating_audio',
      activePhase: 'thinking',
      meta: {
        lastAudioRequestId: requestId,
      },
    });

    realtimeService.emitToSession(session._id, 'interview:audio_pending', {
      sessionId: String(session._id),
      requestId,
      text: question,
    });

    void this.generateAndEmitAudio({
      sessionId: session._id,
      requestId,
      text: question,
    });

    return requestId;
  }

  async generateAndEmitAudio({ sessionId, requestId, text }) {
    try {
      const speechResult = await kokoroService.generateSpeech(text, requestId);
      // If TTS is disabled, kokoroService returns null. Treat as graceful fallback.
      if (!speechResult) {
        logger.info(`[VoiceOrchestrator] TTS disabled; skipping audio for request ${requestId}`);
        realtimeService.emitToSession(sessionId, 'interview:audio_failed', {
          sessionId: String(sessionId),
          requestId,
          text,
          reason: 'tts_disabled'
        });
        return;
      }
      const session = await interviewSessionService.getSessionById(sessionId);

      if (!session || session.meta?.lastAudioRequestId !== requestId) {
        return;
      }

      await interviewSessionService.updateRuntimeState(sessionId, {
        aiState: 'speaking',
        activePhase: 'speaking',
        meta: {
          activeAudioUrl: speechResult.audioUrl || '',
        },
      });

      logVoiceStage('tts_completed', {
        sessionId: String(sessionId),
        requestId,
        provider: speechResult.provider,
      });

      realtimeService.emitToSession(sessionId, 'interview:audio_ready', {
        sessionId: String(sessionId),
        requestId,
        text,
        audioUrl: speechResult.audioUrl,
        mimeType: speechResult.mimeType,
        provider: speechResult.provider,
      });
    } catch (error) {
      logger.error(`[VoiceOrchestrator] Audio generation failed for session ${sessionId}: ${error.message}`);
      logVoiceWarning('tts_failed', {
        sessionId: String(sessionId),
        requestId,
        message: error.message,
      });
      realtimeService.emitToSession(sessionId, 'interview:audio_failed', {
        sessionId: String(sessionId),
        requestId,
        text,
      });
    }
  }

  async interruptSpeech(sessionId) {
    await interviewSessionService.updateRuntimeState(sessionId, {
      aiState: 'listening',
      activePhase: 'candidate_answering',
      meta: {
        activeAudioUrl: '',
      },
    });

    realtimeService.emitToSession(sessionId, 'interview:audio_interrupted', {
      sessionId: String(sessionId),
      interruptedAt: new Date().toISOString(),
    });
  }
}

module.exports = new VoiceOrchestratorService();
