const whisperService = require('../ai/whisper.service');
const kokoroService = require('../ai/kokoro.service');
const ApiError = require('../utils/api-error');
const fs = require('fs');
const interviewEngine = require('../ai/interview.engine');
const interviewSessionService = require('../services/interview-session.service');
const timerService = require('../services/timer.service');
const { SessionExpiredError } = require('../utils/interview-errors');

const cleanupUploadedFile = (file) => {
  if (file?.path && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
};

const sendVoicePipelineError = (res, stage, error) => {
  console.error('Voice Processing Pipeline Failed:', error);
  console.error(error.stack);

  return res.status(error.statusCode || 500).json({
    message: error.message,
    stage,
    details: error.details,
    stack: error.stack,
  });
};

const transcribeAudio = async (req, res, next) => {
  try {
    console.log('Uploaded File:', req.file);
    console.log('Request Body:', req.body);

    if (!req.file) {
      return res.status(400).json({
        message: 'Audio file missing'
      });
    }
    const transcript = await whisperService.transcribeAudio(req.file.path, req.file.mimetype);
    console.log('Transcript Text:', transcript);
    
    // Cleanup file
    cleanupUploadedFile(req.file);
    
    res.status(200).json({ transcript });
  } catch (error) {
    cleanupUploadedFile(req.file);
    console.error('Voice Processing Error:', error);
    console.error(error.stack);
    return sendVoicePipelineError(res, 'transcription', error);
  }
};

const generateSpeech = async (req, res, next) => {
  try {
    const { text } = req.body;
    console.log('TTS Input Text:', text);

    if (!text || text.trim() === '') {
      return res.status(400).json({
        message: 'Text is required for speech generation'
      });
    }

    try {
      const speechResult = await kokoroService.generateSpeech(text);
      return res.status(200).json(speechResult);
    } catch (error) {
      console.error('Kokoro TTS Error:', error);
      console.error(error.stack);

      return res.status(200).json({
        fallback: true,
        text,
        audioUrl: null,
        warning: 'Voice generation unavailable. Continuing in text-assisted mode.',
        details: error.details,
      });
    }
  } catch (error) {
    console.error('Voice Speak Controller Error:', error);
    console.error(error.stack);
    next(error);
  }
};

const processVoiceResponse = async (req, res, next) => {
  try {
    console.log('Voice Pipeline Stage: upload_received');
    console.log('Uploaded File:', req.file);
    console.log('Request Body:', req.body);

    if (!req.file) {
      return res.status(400).json({
        message: 'Audio file missing',
        stage: 'upload_received',
      });
    }
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({
        message: 'Session ID is required',
        stage: 'upload_received',
      });
    }

    console.log('Uploaded File Path:', req.file.path);

    let transcript;
    try {
      console.log('Voice Pipeline Stage: transcription_started');
      transcript = await whisperService.transcribeAudio(req.file.path, req.file.mimetype);
      console.log('Transcript:', transcript);
    } catch (error) {
      cleanupUploadedFile(req.file);
      return sendVoicePipelineError(res, 'transcription', error);
    }

    cleanupUploadedFile(req.file);

    let result;
    try {
      console.log('Generating AI follow-up...');
      console.log('Voice Pipeline Stage: ai_follow_up_generation');
      const session = await interviewSessionService.getOwnedSession(sessionId, req.user._id);

      try {
        await timerService.assertSessionWritable(session);
      } catch (error) {
        if (error instanceof SessionExpiredError) {
          const finalized = await interviewSessionService.endInterview(session, { autoEnded: true });
          return res.status(410).json({
            message: 'Interview time is over. Assessment generated automatically.',
            stage: 'ai_follow_up_generation',
            reportReady: Boolean(finalized.reportGeneratedAt),
            reportUrl: `/interview/report/${finalized._id}`,
            session: interviewSessionService.buildSessionSnapshot(finalized),
          });
        }

        throw error;
      }

      result = await interviewEngine.processResponse(sessionId, transcript);
    } catch (error) {
      return sendVoicePipelineError(res, 'ai_follow_up_generation', error);
    }

    const refreshedSession = await interviewSessionService.getOwnedSession(sessionId, req.user._id);
    const shouldFinalize =
      timerService.getRemainingSeconds(refreshedSession) <= 0
      || refreshedSession.answeredQuestions >= refreshedSession.targetQuestionRange.max;

    if (shouldFinalize) {
      const finalized = await interviewSessionService.endInterview(refreshedSession, {
        autoEnded: timerService.getRemainingSeconds(refreshedSession) <= 0,
      });

      return res.status(200).json({
        transcript,
        question: null,
        audioUrl: null,
        fallback: false,
        completed: true,
        reportReady: Boolean(finalized.reportGeneratedAt),
        reportUrl: `/interview/report/${finalized._id}`,
        session: interviewSessionService.buildSessionSnapshot(finalized),
        evaluation: result.evaluation,
      });
    }

    let speechResult = {
      audioUrl: null,
      fallback: true,
      text: result.question,
      warning: 'Voice generation unavailable. Continuing in text-assisted mode.',
    };
    try {
      console.log('Voice Pipeline Stage: tts_generation');
      speechResult = await kokoroService.generateSpeech(result.question);
    } catch (ttsError) {
      console.error('Speech Generation Failed:', ttsError);
      console.error(ttsError.stack);
    }

    console.log('Voice Pipeline Stage: completed');
    return res.status(200).json({
      transcript,
      question: result.question,
      audioUrl: speechResult.audioUrl,
      fallback: Boolean(speechResult.fallback),
      warning: speechResult.warning,
      completed: false,
      reportUrl: null,
      session: interviewSessionService.buildSessionSnapshot(refreshedSession),
      evaluation: {
        ...result.evaluation,
        fallback: Boolean(result.evaluation?.fallback || speechResult.fallback),
      }
    });
  } catch (error) {
    cleanupUploadedFile(req.file);
    console.error('Voice Processing Error:', error);
    console.error(error.stack);
    console.error('Voice Response Controller Error:', error);
    console.error(error.stack);
    return sendVoicePipelineError(res, 'voice_pipeline', error);
  }
};


module.exports = {
  transcribeAudio,
  generateSpeech,
  processVoiceResponse
};
