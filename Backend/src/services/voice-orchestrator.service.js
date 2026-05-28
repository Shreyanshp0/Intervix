import crypto from 'crypto';
import kokoroService from '../ai/kokoro.service.js';
import openaiTtsService from '../ai/openai-tts.service.js';
import realtimeService from './realtime.service.js';
import interviewSessionService from './interview-session.service.js';
import logger from '../config/logger.js';
import { logVoiceStage, logVoiceWarning } from '../utils/voice-pipeline-logger.js';

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
      let speechResult = null;
      let usedFallback = false;

      // 1. Try Kokoro primary TTS
      try {
        speechResult = await kokoroService.generateSpeech(text, requestId);
      } catch (kokoroError) {
        logger.warn(`[VoiceOrchestrator] Kokoro TTS failed: ${kokoroError.message}. Attempting OpenAI fallback...`);
      }

      // 2. Try OpenAI fallback if Kokoro is unavailable and API key is set
      if (!speechResult && process.env.OPENAI_API_KEY) {
        try {
          speechResult = await openaiTtsService.generateSpeech(text, requestId);
          usedFallback = true;
        } catch (openaiError) {
          logger.error(`[VoiceOrchestrator] OpenAI TTS fallback failed: ${openaiError.message}`);
        }
      }

      // 3. Fallback to browser client SpeechSynthesis
      if (!speechResult) {
        logger.warn(`[VoiceOrchestrator] All backend TTS options failed/offline. Emitting audio_failed to trigger client SpeechSynthesis fallback.`);
        realtimeService.emitToSession(sessionId, 'interview:audio_failed', {
          sessionId: String(sessionId),
          requestId,
          text,
          reason: 'backend_tts_depleted'
        });

        // Set to speaking status anyway so client transitions and reads/speaks the question text
        await interviewSessionService.updateRuntimeState(sessionId, {
          aiState: 'speaking',
          activePhase: 'speaking',
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
        fallback: usedFallback,
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
      logger.error(`[VoiceOrchestrator] Audio generation critical failure for session ${sessionId}: ${error.message}`);
      logVoiceWarning('tts_failed', {
        sessionId: String(sessionId),
        requestId,
        message: error.message,
      });
      realtimeService.emitToSession(sessionId, 'interview:audio_failed', {
        sessionId: String(sessionId),
        requestId,
        text,
        reason: 'critical_orchestrator_failure'
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

export default new VoiceOrchestratorService();
