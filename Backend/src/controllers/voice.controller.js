import whisperService from '../ai/whisper.service.js';
import kokoroService from '../ai/kokoro.service.js';
import interviewEngine from '../ai/interview.engine.js';
import interviewSessionService from '../services/interview-session.service.js';
import timerService from '../services/timer.service.js';
import realtimeService from '../services/realtime.service.js';
import voiceOrchestratorService from '../services/voice-orchestrator.service.js';
import { SessionExpiredError } from '../utils/interview-errors.js';
import { VoicePipelineError } from '../utils/voice-errors.js';
import { safeRemoveFile } from '../utils/file-cleanup.js';
import { logVoiceStage, logVoiceError, logVoiceWarning } from '../utils/voice-pipeline-logger.js';
import { acquireLock, releaseLock } from '../utils/processing-lock.js';

const buildVoiceErrorResponse = (stage, error) => ({
  success: false,
  stage,
  error: error?.message || 'Voice processing failed',
  ...(error?.details ? { details: error.details } : {}),
});

const transcribeAudio = async (req, res, next) => {
  let currentStage = 'upload_received';
  try {
    logVoiceStage(currentStage, {
      requestBody: req.body,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
      } : null,
    });

    if (!req.file) {
      throw new VoicePipelineError(currentStage, 'Audio file missing', {}, 400);
    }

    currentStage = 'transcription_started';
    logVoiceStage(currentStage);
    const transcript = await whisperService.transcribeAudio(req.file.path, req.file.mimetype);
    currentStage = 'transcription_completed';
    logVoiceStage(currentStage, {
      transcriptPreview: transcript.slice(0, 200),
    });

    logVoiceStage('response_sent');
    res.status(200).json({ success: true, transcript });
  } catch (error) {
    logVoiceError(currentStage, error);
    if (currentStage === 'transcription_started' || currentStage === 'transcription_completed') {
      return res.status(200).json({
        success: false,
        fallback: 'browser-stt',
        recoverable: true,
        message: error.message || 'Speech transcription service unavailable'
      });
    }
    return res.status(error.statusCode || 500).json(buildVoiceErrorResponse(currentStage, error));
  } finally {
    await safeRemoveFile(req.file?.path, { stage: 'transcription' });
  }
};

const generateSpeech = async (req, res, next) => {
  let currentStage = 'tts_started';
  try {
    const { text } = req.body;
    logVoiceStage(currentStage, { textPreview: (text || '').slice(0, 160) });

    if (!text || text.trim() === '') {
      return res.status(400).json({
        message: 'Text is required for speech generation'
      });
    }

    try {
        const speechResult = await kokoroService.generateSpeech(text);
        if (!speechResult) {
          logVoiceStage('tts_skipped', { reason: 'disabled' });
          return res.status(200).json({
            fallback: true,
            text,
            audioUrl: null,
            warning: 'TTS disabled. Continuing in text-only mode.',
          });
        }

        logVoiceStage('tts_completed', { provider: speechResult.provider });
        return res.status(200).json(speechResult);
    } catch (error) {
      logVoiceWarning('tts_failed', {
        message: error.message,
        details: error.details,
      });

      return res.status(200).json({
        fallback: true,
        text,
        audioUrl: null,
        warning: 'Voice generation unavailable. Continuing in text-assisted mode.',
        details: error.details,
      });
    }
  } catch (error) {
    logVoiceError(currentStage, error);
    return res.status(error.statusCode || 500).json(buildVoiceErrorResponse(currentStage, error));
  }
};

const processVoiceResponse = async (req, res, next) => {
  let currentStage = 'upload_received';
  let sessionId;
  let transcript;
  try {
    logVoiceStage(currentStage, {
      requestBody: req.body,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
      } : null,
    });

    if (!req.file) {
      throw new VoicePipelineError(currentStage, 'Audio file missing', {}, 400);
    }

    sessionId = req.body.sessionId;
    if (!sessionId) {
      throw new VoicePipelineError(currentStage, 'Session ID is required', {}, 400);
    }

    if (!acquireLock(sessionId, 'voice-respond')) {
      throw new VoicePipelineError(currentStage, 'AI voice response generation is already in progress.', {}, 409);
    }

    const ownedSession = await interviewSessionService.getOwnedSession(sessionId, req.user._id);
    await timerService.assertSessionWritable(ownedSession);

    await interviewSessionService.updateRuntimeState(sessionId, {
      aiState: 'transcribing',
      activePhase: 'transcribing',
      recovery: {
        lastKnownConnectionState: 'connected',
      },
    });
    realtimeService.emitToSession(sessionId, 'interview:phase', {
      sessionId,
      aiState: 'transcribing',
      activePhase: 'transcribing',
    });

    currentStage = 'transcription_started';
    logVoiceStage(currentStage);
    transcript = await whisperService.transcribeAudio(req.file.path, req.file.mimetype);
    currentStage = 'transcription_completed';
    logVoiceStage(currentStage, {
      transcriptPreview: transcript.slice(0, 200),
    });

    realtimeService.emitToSession(sessionId, 'interview:user_transcript', {
      sessionId,
      transcript,
      createdAt: new Date().toISOString(),
    });

    currentStage = 'ai_processing_started';
    logVoiceStage(currentStage, { sessionId });
    await interviewSessionService.updateRuntimeState(sessionId, {
      aiState: 'thinking',
      activePhase: 'thinking',
    });
    realtimeService.emitToSession(sessionId, 'interview:phase', {
      sessionId,
      aiState: 'thinking',
      activePhase: 'thinking',
    });

    const result = await interviewEngine.processResponse(sessionId, transcript);
    currentStage = 'ai_processing_completed';
    logVoiceStage(currentStage, {
      sessionId,
      fallback: Boolean(result?.evaluation?.fallback),
    });

    const refreshedSession = await interviewSessionService.getOwnedSession(sessionId, req.user._id);
    const shouldFinalize =
      timerService.getRemainingSeconds(refreshedSession) <= 0
      || refreshedSession.answeredQuestions >= refreshedSession.targetQuestionRange.max;

    if (shouldFinalize) {
      const finalized = await interviewSessionService.endInterview(refreshedSession, {
        autoEnded: timerService.getRemainingSeconds(refreshedSession) <= 0,
      });
      logVoiceStage('tts_completed', { status: 'skipped' });
      logVoiceStage('response_sent', { completed: true });
      return res.status(200).json({
        success: true,
        transcript,
        question: null,
        audioUrl: null,
        fallback: false,
        completed: true,
        reportReady: Boolean(finalized.reportGeneratedAt),
        reportUrl: `/candidate/interview/report/${finalized._id}`,
        session: interviewSessionService.buildSessionSnapshot(finalized),
        evaluation: result.evaluation,
      });
    }
    let requestId = null;
    currentStage = 'tts_started';
    logVoiceStage(currentStage, { sessionId });
    try {
      requestId = await voiceOrchestratorService.queueAudioForQuestion(refreshedSession, result.question);
      logVoiceStage('tts_completed', { sessionId, requestId, status: 'queued' });
    } catch (error) {
      logVoiceWarning('tts_failed', {
        sessionId,
        message: error.message,
      });
      logVoiceStage('tts_completed', { sessionId, status: 'failed' });
    }

    logVoiceStage('response_sent', { completed: false, sessionId });
    return res.status(200).json({
      success: true,
      transcript,
      question: result.question,
      audioUrl: null,
      fallback: false,
      warning: 'Audio is being prepared and will arrive asynchronously.',
      completed: false,
      reportUrl: null,
      audioPending: Boolean(requestId),
      audioRequestId: requestId,
      session: interviewSessionService.buildSessionSnapshot(refreshedSession),
      evaluation: {
        ...result.evaluation,
        fallback: Boolean(result.evaluation?.fallback),
      }
    });
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      const session = await interviewSessionService.getOwnedSession(sessionId, req.user._id);
      const finalized = await interviewSessionService.endInterview(session, { autoEnded: true });
      return res.status(410).json({
        success: false,
        stage: 'ai_processing_started',
        error: 'Interview time is over. Assessment generated automatically.',
        reportReady: Boolean(finalized.reportGeneratedAt),
        reportUrl: `/candidate/interview/report/${finalized._id}`,
        session: interviewSessionService.buildSessionSnapshot(finalized),
      });
    }

    logVoiceError(currentStage, error, { sessionId });

    if (currentStage === 'transcription_started' || currentStage === 'transcription_completed') {
      if (sessionId) {
        try {
          await interviewSessionService.updateRuntimeState(sessionId, {
            aiState: 'idle',
            activePhase: 'active',
          });
          realtimeService.emitToSession(sessionId, 'interview:phase', {
            sessionId,
            aiState: 'idle',
            activePhase: 'active',
          });
        } catch (stateErr) {
          logVoiceWarning('state_reset_failed', { sessionId, message: stateErr.message });
        }
      }

      return res.status(200).json({
        success: false,
        fallback: 'browser-stt',
        recoverable: true,
        message: error.message || 'Speech transcription service unavailable'
      });
    }

    return res.status(error.statusCode || 500).json(buildVoiceErrorResponse(currentStage, error));
  } finally {
    if (sessionId) {
      releaseLock(sessionId);
    }
    await safeRemoveFile(req.file?.path, { stage: 'respond', sessionId });
  }
};

export {
  transcribeAudio,
  generateSpeech,
  processVoiceResponse
};