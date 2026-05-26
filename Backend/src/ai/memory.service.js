import InterviewMemory from '../models/InterviewMemory.js';
import InterviewMessage from '../models/InterviewMessage.js';
import logger from '../config/logger.js';

class MemoryService {
  async getSessionMemory(sessionId) {
    let memory = await InterviewMemory.findOne({ sessionId });
    if (!memory) {
      memory = await InterviewMemory.create({ sessionId });
    }
    return memory;
  }

  async getRecentMessages(sessionId, limit = 5) {
    const messages = await InterviewMessage.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(limit);

    return messages.reverse();
  }

  async getConversationHistory(sessionId, limit = 12) {
    const messages = await InterviewMessage.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(limit);

    return messages.reverse();
  }

  appendUniqueItems(targetArray, items = []) {
    items
      .filter((item) => typeof item === 'string' && item.trim())
      .forEach((item) => {
        if (!targetArray.includes(item)) {
          targetArray.push(item);
        }
      });
  }

  normalizeTopic(topic) {
    if (typeof topic !== 'string' || !topic.trim()) {
      return null;
    }

    return topic.trim();
  }

  async updateMemory(sessionId, update = {}) {
    try {
      const memory = await this.getSessionMemory(sessionId);

      this.appendUniqueItems(memory.mentionedTechnologies, update.keywords);
      this.appendUniqueItems(memory.strongAreas, update.strongAreas);
      this.appendUniqueItems(memory.weakAreas, update.weakAreas);
      this.appendUniqueItems(memory.previousQuestions, update.previousQuestions);
      this.appendUniqueItems(memory.candidateClaims, update.candidateClaims);
      this.appendUniqueItems(memory.discussedTopics, update.discussedTopics);

      if (typeof update.candidateAnswer === 'string' && update.candidateAnswer.trim()) {
        memory.candidateAnswers.push(update.candidateAnswer.trim());
      }

      if (Array.isArray(update.conversationEntries) && update.conversationEntries.length > 0) {
        update.conversationEntries.forEach((entry) => {
          if (entry?.role && typeof entry.content === 'string' && entry.content.trim()) {
            memory.conversationHistory.push({
              role: entry.role,
              content: entry.content.trim(),
            });
          }
        });
      }

      if (memory.conversationHistory.length > 30) {
        memory.conversationHistory = memory.conversationHistory.slice(-30);
      }

      if (memory.candidateAnswers.length > 15) {
        memory.candidateAnswers = memory.candidateAnswers.slice(-15);
      }

      if (typeof update.confidenceScore === 'number') {
        memory.confidenceTrends.push({ score: update.confidenceScore });
      }

      const normalizedTopic = this.normalizeTopic(update.currentTopic);
      if (normalizedTopic) {
        memory.flowState.currentTopic = normalizedTopic;
      }

      if (typeof update.currentDifficulty === 'string' && update.currentDifficulty.trim()) {
        memory.flowState.currentDifficulty = update.currentDifficulty.trim();
      }

      if (typeof update.followUpDepthLevel === 'number') {
        memory.flowState.followUpDepthLevel = update.followUpDepthLevel;
        memory.currentTopicDepth = update.followUpDepthLevel;
      }

      if (typeof update.introductionCompleted === 'boolean') {
        memory.flowState.introductionCompleted = update.introductionCompleted;
      }

      if (typeof update.fundamentalsCompleted === 'boolean') {
        memory.flowState.fundamentalsCompleted = update.fundamentalsCompleted;
      }

      await memory.save();
      return memory;
    } catch (error) {
      logger.error(`Memory Update Error: ${error.message}`);
    }
  }
}

export default new MemoryService();
