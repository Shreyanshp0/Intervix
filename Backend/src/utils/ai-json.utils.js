const extractJsonPayload = (rawText = '') => {
  const trimmedText = String(rawText || '').trim();
  const withoutFence = trimmedText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');

  const firstBrace = withoutFence.indexOf('{');
  const lastBrace = withoutFence.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return withoutFence;
  }

  return withoutFence.slice(firstBrace, lastBrace + 1);
};

const safeJsonParse = (rawText = '') => {
  const cleanedText = extractJsonPayload(rawText);

  try {
    return {
      ok: true,
      value: JSON.parse(cleanedText),
      cleanedText,
    };
  } catch (error) {
    return {
      ok: false,
      error,
      cleanedText,
    };
  }
};

const buildFallbackInterviewResponse = ({ topic = 'technical interview', difficulty = 'medium' } = {}) => ({
  technicalScore: 50,
  communicationScore: 50,
  confidenceScore: 50,
  answerScore: 50,
  keywords: [],
  strongAreas: [],
  weakAreas: [],
  difficulty,
  followUpQuestion: `Tell me about your experience with ${topic} and how you have applied it in practice.`,
  nextTopic: topic,
  interviewerTone: 'neutral',
  fallback: true,
  feedback: 'Fallback question used after invalid AI response.',
});

module.exports = {
  extractJsonPayload,
  safeJsonParse,
  buildFallbackInterviewResponse,
};
