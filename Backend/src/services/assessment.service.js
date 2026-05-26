import aiService from '../ai/groq.service.js';
import logger from '../config/logger.js';
import { InterviewError } from '../utils/interview-errors.js';

class AssessmentService {
  validateAssessment(data) {
    if (!data || typeof data !== 'object') {
      throw new InterviewError(502, 'Assessment engine returned an invalid payload');
    }

    const normalized = {
      overallScore: Number.isFinite(data.overallScore) ? data.overallScore : 0,
      technicalScore: Number.isFinite(data.technicalScore) ? data.technicalScore : 0,
      communicationScore: Number.isFinite(data.communicationScore) ? data.communicationScore : 0,
      confidenceScore: Number.isFinite(data.confidenceScore) ? data.confidenceScore : 0,
      problemSolvingScore: Number.isFinite(data.problemSolvingScore) ? data.problemSolvingScore : 0,
      depthScore: Number.isFinite(data.depthScore) ? data.depthScore : 0,
      strengths: Array.isArray(data.strongAreas || data.strengths) ? (data.strongAreas || data.strengths).slice(0, 6) : [],
      weaknesses: Array.isArray(data.weakAreas || data.weaknesses) ? (data.weakAreas || data.weaknesses).slice(0, 6) : [],
      suggestions: Array.isArray(data.suggestions) ? data.suggestions.slice(0, 6) : [],
      recommendedStudyTopics: Array.isArray(data.recommendedStudyTopics) ? data.recommendedStudyTopics.slice(0, 6) : [],
      hiringReadiness: typeof data.hiringReadiness === 'string' ? data.hiringReadiness : 'Needs more practice',
      finalSummary: typeof data.finalSummary === 'string' ? data.finalSummary : '',
      transcriptFeedback: Array.isArray(data.transcriptFeedback) ? data.transcriptFeedback : [],
    };

    return normalized;
  }

  async finalizeAssessment(session, transcript) {
    let lastError;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const assessment = await aiService.generateAssessment({
          session,
          transcript,
        });
        return this.validateAssessment(assessment);
      } catch (error) {
        lastError = error;
        logger.error(`[AssessmentService] Attempt ${attempt} failed for session ${session._id}: ${error.message}`);
      }
    }

    logger.error(`[AssessmentService] Falling back to deterministic scoring for session ${session._id}: ${lastError?.message}`);
    return this.buildFallbackAssessment(session, transcript);
  }

  buildFallbackAssessment(session, transcript = []) {
    const answerScores = transcript.map((entry) => entry.score || 0);
    const technicalScores = transcript.map((entry) => entry.technicalScore || entry.score || 0);
    const communicationScores = transcript.map((entry) => entry.communicationScore || entry.score || 0);
    const confidenceScores = transcript.map((entry) => entry.confidenceScore || entry.score || 0);

    const average = (values) => {
      const valid = values.filter((value) => Number.isFinite(value));
      return valid.length ? Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length) : 0;
    };

    return {
      overallScore: average(answerScores),
      technicalScore: average(technicalScores),
      communicationScore: average(communicationScores),
      confidenceScore: average(confidenceScores),
      problemSolvingScore: average(technicalScores),
      depthScore: average(answerScores),
      strengths: session.strengths?.length ? session.strengths : ['Stayed engaged throughout the interview'],
      weaknesses: session.weaknesses?.length ? session.weaknesses : ['Assessment fallback used due to AI response issue'],
      suggestions: ['Practice timed explanations and revisit lower-scoring concepts.'],
      recommendedStudyTopics: [session.topic],
      hiringReadiness: average(answerScores) >= 75 ? 'Interview ready' : 'Needs more practice',
      finalSummary: 'Assessment generated using deterministic fallback scoring because the AI evaluation service was unavailable.',
      transcriptFeedback: [],
    };
  }
}

export default new AssessmentService();
