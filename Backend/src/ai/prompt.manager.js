const SYSTEM_PROMPTS = require('../prompts/interviewer.prompts');
const {
  buildInterviewContext,
  compactHistory,
} = require('./groq.utils');

class PromptManager {
  buildInterviewPrompt(session, memory, recentMessages, currentInput, conversationHistory = []) {
    const previousQuestions = Array.isArray(memory?.previousQuestions) ? memory.previousQuestions : [];
    const discussedTopics = Array.isArray(memory?.discussedTopics) ? memory.discussedTopics : [];
    const historySource = Array.isArray(recentMessages) && recentMessages.length > 0
      ? recentMessages
      : conversationHistory;
    const context = buildInterviewContext({
      topic: session.topic,
      difficulty: session.difficulty,
      interviewType: session.interviewType,
      experienceLevel: session.experienceLevel,
      currentInput: currentInput || 'Ask the next technical interview question.',
      recentHistory: compactHistory(historySource, 3),
      previousQuestions,
      discussedTopics,
    });

    return {
      systemInstruction: SYSTEM_PROMPTS.interviewer,
      context,
    };
  }
}

module.exports = new PromptManager();
