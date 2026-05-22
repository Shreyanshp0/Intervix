const DEFAULT_HISTORY_LIMIT = 3;
const DEFAULT_TOKEN_BUDGET = 6500;

function compactText(value, maxLength = 500) {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
}

function compactList(values = [], maxItems = 4, maxItemLength = 60) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => compactText(value, maxItemLength))
    .filter(Boolean)
    .slice(-maxItems);
}

function compactHistory(entries = [], limit = DEFAULT_HISTORY_LIMIT) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter((entry) => entry?.role && typeof entry.content === 'string' && entry.content.trim())
    .slice(-limit)
    .map((entry) => ({
      role: entry.role,
      content: compactText(entry.content, 280),
    }));
}

function pruneEmptyFields(input = {}) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (value == null) {
        return false;
      }

      if (Array.isArray(value)) {
        return value.length > 0;
      }

      if (typeof value === 'string') {
        return value.trim().length > 0;
      }

      if (typeof value === 'object') {
        return Object.keys(value).length > 0;
      }

      return true;
    })
  );
}

function estimateTokens(messages = []) {
  const contentSize = messages.reduce((total, message) => {
    const roleSize = typeof message?.role === 'string' ? message.role.length : 0;
    const contentSize = typeof message?.content === 'string'
      ? message.content.length
      : JSON.stringify(message?.content || '').length;
    return total + roleSize + contentSize;
  }, 0);

  return Math.ceil(contentSize / 4) + (messages.length * 12);
}

function supportsReasoningEffort(model = '') {
  return /^openai\/gpt-oss-/i.test(model);
}

function buildInterviewContext({
  topic,
  difficulty,
  interviewType,
  experienceLevel,
  currentInput,
  recentHistory,
  previousQuestions,
  discussedTopics,
}) {
  return pruneEmptyFields({
    topic: compactText(topic || 'technical interview', 80),
    difficulty: compactText(difficulty || 'medium', 20),
    interviewType: compactText(interviewType || 'technical', 40),
    experienceLevel: compactText(experienceLevel || 'Intermediate', 40),
    currentInput: compactText(currentInput || 'Ask the next interview question.', 500),
    recentHistory: compactHistory(recentHistory, DEFAULT_HISTORY_LIMIT),
    previousQuestions: compactList(previousQuestions, 3, 120),
    discussedTopics: compactList(discussedTopics, 4, 40),
  });
}

function trimContextForTokens(context = {}) {
  const nextContext = {
    ...context,
    recentHistory: Array.isArray(context.recentHistory) ? context.recentHistory.slice(2) : [],
    previousQuestions: Array.isArray(context.previousQuestions) ? context.previousQuestions.slice(-2) : [],
    discussedTopics: Array.isArray(context.discussedTopics) ? context.discussedTopics.slice(-2) : [],
  };

  if (Array.isArray(nextContext.recentHistory) && nextContext.recentHistory.length === 0) {
    delete nextContext.recentHistory;
  }

  if (Array.isArray(nextContext.previousQuestions) && nextContext.previousQuestions.length === 0) {
    delete nextContext.previousQuestions;
  }

  if (Array.isArray(nextContext.discussedTopics) && nextContext.discussedTopics.length === 0) {
    delete nextContext.discussedTopics;
  }

  return pruneEmptyFields(nextContext);
}

function shouldTrimForBudget(messages = [], budget = DEFAULT_TOKEN_BUDGET) {
  return estimateTokens(messages) > budget;
}

module.exports = {
  DEFAULT_HISTORY_LIMIT,
  DEFAULT_TOKEN_BUDGET,
  compactHistory,
  compactList,
  compactText,
  pruneEmptyFields,
  estimateTokens,
  supportsReasoningEffort,
  buildInterviewContext,
  trimContextForTokens,
  shouldTrimForBudget,
};
