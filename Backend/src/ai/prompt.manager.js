const SYSTEM_PROMPTS = require('../prompts/interviewer.prompts');
const {
  buildInterviewContext,
  compactHistory,
} = require('./groq.utils');

class PromptManager {
  buildInterviewPrompt(session, memory, recentMessages, currentInput, conversationHistory = [], profile = null) {
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

    if (profile) {
      context.candidateBackground = {
        name: profile.name,
        skills: profile.skills?.raw || [],
        experience: (profile.experience || []).map(e => ({
          company: e.company,
          title: e.title,
          description: e.description || ''
        })),
        projects: (profile.projects || []).map(p => ({
          name: p.name,
          role: p.role,
          description: p.description || '',
          technologies: p.technologies || []
        }))
      };

      if (profile.resume && profile.resume.aiAnalysis) {
        context.candidateBackground.resumeSummary = profile.resume.aiAnalysis.recruiterSummary || '';
      }
    }

    let systemInstruction = SYSTEM_PROMPTS.interviewer;
    if (profile && profile.resume) {
      systemInstruction += ' IMPORTANT: A parsed resume is available for this candidate. You should dynamically challenge their claimed skills, ask project-specific technical questions, conduct technology deep-dives, and check architectural trade-offs based on the concrete experience and projects they listed.';
    }

    return {
      systemInstruction,
      context,
    };
  }
}

module.exports = new PromptManager();
