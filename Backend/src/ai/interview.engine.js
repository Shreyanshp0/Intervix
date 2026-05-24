const aiService = require('./groq.service');
const memoryService = require('./memory.service');
const promptManager = require('./prompt.manager');
const InterviewSession = require('../models/InterviewSession');
const InterviewMessage = require('../models/InterviewMessage');
const logger = require('../config/logger');
const timerService = require('../services/timer.service');
const interviewSessionService = require('../services/interview-session.service');
const { buildFallbackInterviewResponse } = require('../utils/ai-json.utils');

class InterviewEngine {
  normalizeQuestion(question = '') {
    return question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  calculateQuestionSimilarity(questionA, questionB) {
    const normalizedA = this.normalizeQuestion(questionA);
    const normalizedB = this.normalizeQuestion(questionB);

    if (!normalizedA || !normalizedB) {
      return 0;
    }

    if (normalizedA === normalizedB) {
      return 1;
    }

    const tokensA = new Set(normalizedA.split(' '));
    const tokensB = new Set(normalizedB.split(' '));
    const sharedCount = [...tokensA].filter((token) => tokensB.has(token)).length;
    const maxTokenCount = Math.max(tokensA.size, tokensB.size, 1);
    return sharedCount / maxTokenCount;
  }

  isRepeatedQuestion(question, previousQuestions = []) {
    return previousQuestions.some((previousQuestion) => {
      const similarity = this.calculateQuestionSimilarity(question, previousQuestion);
      return similarity >= 0.8;
    });
  }

  getRelevantTopics(session, memory, candidateInput) {
    const topics = [
      session?.topic,
      memory?.flowState?.currentTopic,
      ...(Array.isArray(memory?.discussedTopics) ? memory.discussedTopics.slice(-3) : []),
    ].filter(Boolean);

    if (typeof candidateInput === 'string' && candidateInput.trim()) {
      const words = candidateInput
        .split(/[\s,.;:!?()]+/)
        .map((word) => word.trim())
        .filter((word) => word.length > 3)
        .slice(0, 4);
      topics.push(...words);
    }

    return [...new Set(topics)];
  }

  buildManualFollowUp(session, memory, candidateInput, previousQuestions = []) {
    const relevantTopics = this.getRelevantTopics(session, memory, candidateInput);
    const currentTopic = memory?.flowState?.currentTopic || relevantTopics[0] || session?.topic || 'this area';
    const followUpDepthLevel = (memory?.flowState?.followUpDepthLevel || 0) + 1;

    const candidates = [
      `You mentioned ${currentTopic}. Can you walk me through a concrete implementation decision you made there?`,
      `What trade-offs would you consider when using ${currentTopic} in production?`,
      `How would you analyze the time and space complexity of your approach for ${currentTopic}?`,
      `What edge cases or failure scenarios would you test for in ${currentTopic}?`,
      `If the requirements scaled significantly, how would your approach to ${currentTopic} change?`,
    ];

    const uniqueCandidate = candidates.find((candidate) => !this.isRepeatedQuestion(candidate, previousQuestions));

    return {
      technicalScore: 45,
      communicationScore: 45,
      confidenceScore: 45,
      keywords: [],
      strongAreas: [],
      weakAreas: [],
      difficulty: session?.difficulty || memory?.flowState?.currentDifficulty || 'medium',
      followUpQuestion: uniqueCandidate || `Can you go one level deeper on ${currentTopic} and explain the trade-offs in your approach?`,
      nextTopic: currentTopic,
      interviewerTone: 'neutral',
      fallback: true,
      followUpDepthLevel,
      answerScore: 45,
      feedback: 'Provided a usable answer, but a fallback question was needed to keep the interview moving.',
    };
  }

  buildFallbackQuestion(session) {
    const topic = session?.topic || 'technical interview';

    return {
      technicalScore: 50,
      communicationScore: 50,
      confidenceScore: 50,
      keywords: [],
      strongAreas: [],
      weakAreas: [],
      difficulty: session?.difficulty || 'medium',
      followUpQuestion: `Tell me about your experience with ${topic} and how you have applied it in practice.`,
      nextTopic: topic,
      interviewerTone: 'neutral',
      fallback: true,
      followUpDepthLevel: 0,
      answerScore: 50,
      feedback: 'Fallback opening question used.',
    };
  }

  determineAdaptiveDifficulty(session) {
    const recentAverage = session?.progress?.recentAverageScore || 0;

    if (recentAverage >= 80) {
      return 'hard';
    }

    if (recentAverage <= 45) {
      return 'easy';
    }

    return 'medium';
  }

  /**
   * Processes a candidate's answer and generates the next question
   * @param {string} sessionId
   * @param {string} candidateInput Text response or transcribed voice
   * @returns {Promise<Object>} The generated action and updated session details
   */
  async processResponse(sessionId, candidateInput) {
    try {
      const session = await InterviewSession.findById(sessionId);
      if (!session) throw new Error('Session not found');
      await timerService.assertSessionWritable(session);

      // Save user message
      await InterviewMessage.create({
        sessionId,
        role: 'user',
        content: candidateInput
      });

      // Get context
      const memory = await memoryService.getSessionMemory(sessionId);
      const recentMessages = await memoryService.getRecentMessages(sessionId, 6);
      const adaptiveDifficulty = this.determineAdaptiveDifficulty(session);

      // Build prompt
      const { systemInstruction, context } = promptManager.buildInterviewPrompt(
        session, memory, recentMessages, candidateInput
      );
      context.difficulty = adaptiveDifficulty;

      // Generate AI response
      let aiResponse;
      try {
        aiResponse = await aiService.generateInterviewAction(systemInstruction, context);
      } catch (error) {
        logger.error(`Interview Engine AI failure for session ${sessionId}: ${error.message}`);
        if (error?.details?.parseError) {
          aiResponse = buildFallbackInterviewResponse({
            topic: session?.topic,
            difficulty: session?.difficulty || adaptiveDifficulty,
          });
        } else {
          aiResponse = this.buildManualFollowUp(session, memory, candidateInput, context.previousQuestions);
        }
      }

      if (this.isRepeatedQuestion(aiResponse.followUpQuestion, context.previousQuestions)) {
        logger.error(`Repeated question detected for session ${sessionId}: ${aiResponse.followUpQuestion}`);

        try {
          aiResponse = await aiService.generateInterviewAction(
            systemInstruction,
            {
              ...context,
              currentInput: `${candidateInput}\nAvoid repeating prior questions. Ask a sharper follow-up on a nearby concept.`,
            }
          );
        } catch (error) {
          logger.error(`Question regeneration failed for session ${sessionId}: ${error.message}`);
          aiResponse = this.buildManualFollowUp(session, memory, candidateInput, context.previousQuestions);
        }
      }

      if (this.isRepeatedQuestion(aiResponse.followUpQuestion, context.previousQuestions)) {
        aiResponse = this.buildManualFollowUp(session, memory, candidateInput, context.previousQuestions);
      }

      console.log('Generated Question:', aiResponse.followUpQuestion);

      // Update Memory
      const nextDepthLevel = aiResponse.followUpDepthLevel ?? ((memory.flowState?.followUpDepthLevel || 0) + 1);
      await memoryService.updateMemory(sessionId, {
        ...aiResponse,
        previousQuestions: [aiResponse.followUpQuestion],
        candidateAnswer: candidateInput,
        candidateClaims: context.mentionedTech,
        discussedTopics: [aiResponse.nextTopic || session.topic, ...(aiResponse.keywords || [])],
        conversationEntries: [
          { role: 'user', content: candidateInput },
          { role: 'interviewer', content: aiResponse.followUpQuestion },
        ],
        currentTopic: aiResponse.nextTopic || memory.flowState?.currentTopic || session.topic,
        currentDifficulty: aiResponse.difficulty || session.difficulty,
        followUpDepthLevel: nextDepthLevel,
        introductionCompleted: true,
        fundamentalsCompleted: nextDepthLevel >= 3,
      });

      // Save AI message
      await InterviewMessage.create({
        sessionId,
        role: 'interviewer',
        content: aiResponse.followUpQuestion,
        metadata: {
          score: aiResponse.technicalScore,
          keywords: aiResponse.keywords,
          nextTopic: aiResponse.nextTopic,
          followUpDepthLevel: nextDepthLevel,
          fallback: Boolean(aiResponse.fallback),
        }
      });

      const nextDifficulty = aiResponse.difficulty || adaptiveDifficulty || session.difficulty;
      if (nextDifficulty && nextDifficulty !== session.difficulty) {
        session.difficulty = nextDifficulty;
      }

      interviewSessionService.addAnswerToTranscript(session, candidateInput, aiResponse);
      interviewSessionService.addQuestionToTranscript(session, aiResponse.followUpQuestion, nextDifficulty);

      session.progress = {
        currentTopic: aiResponse.nextTopic || memory.flowState?.currentTopic || session.topic,
        followUpDepthLevel: nextDepthLevel,
        introductionCompleted: true,
        fundamentalsCompleted: nextDepthLevel >= 3,
        questionCount: session.transcript.length,
        recentAverageScore: interviewSessionService.computeRecentAverage(session.transcript),
      };
      session.totalQuestions = session.transcript.length;
      session.lastActivityAt = new Date();
      await session.save();

      return {
        question: aiResponse.followUpQuestion,
        evaluation: {
          technicalScore: aiResponse.technicalScore,
          communicationScore: aiResponse.communicationScore,
          confidenceScore: aiResponse.confidenceScore,
          answerScore: aiResponse.answerScore || aiResponse.technicalScore,
          feedback: aiResponse.feedback || '',
          difficulty: nextDifficulty,
          tone: aiResponse.interviewerTone,
          currentTopic: aiResponse.nextTopic || session.topic,
          followUpDepthLevel: nextDepthLevel,
          fallback: Boolean(aiResponse.fallback),
          remainingSeconds: timerService.getRemainingSeconds(session),
        }
      };
    } catch (error) {
      logger.error(`Interview Engine Error: ${error.message}`);
      console.error('Interview Engine Error:', error);
      throw error;
    }
  }

  /**
   * Starts an interview by generating the first question
   */
  async startInterview(sessionId) {
    try {
      const session = await InterviewSession.findById(sessionId);
      if (!session) throw new Error('Session not found');

      const prompt = `Start a ${session.mode || 'text'} ${session.topic || 'technical'} interview at ${session.difficulty || 'medium'} difficulty. Ask the very first opening question. Output JSON format only.`;

      let aiResponse;
      try {
        const memory = await memoryService.getSessionMemory(sessionId);
        aiResponse = await aiService.generateInterviewAction(
          require('../prompts/interviewer.prompts').interviewer,
          {
            topic: session.topic,
            difficulty: session.difficulty,
            experienceLevel: session.experienceLevel,
            interviewType: session.interviewType,
            currentInput: prompt,
            previousQuestions: memory.previousQuestions || [],
            discussedTopics: memory.discussedTopics || [],
            recentHistory: (memory.conversationHistory || []).slice(-4),
          }
        );
      } catch (error) {
        logger.error(`Start interview Groq failure for session ${sessionId}: ${error.message}`);
        aiResponse = this.buildFallbackQuestion(session);
      }

      interviewSessionService.addQuestionToTranscript(session, aiResponse.followUpQuestion, aiResponse.difficulty || session.difficulty);

      await InterviewMessage.create({
        sessionId,
        role: 'interviewer',
        content: aiResponse.followUpQuestion,
        metadata: {
          fallback: Boolean(aiResponse.fallback),
          nextTopic: aiResponse.nextTopic || session.topic,
          followUpDepthLevel: 0,
        }
      });

      await memoryService.updateMemory(sessionId, {
        previousQuestions: [aiResponse.followUpQuestion],
        discussedTopics: [aiResponse.nextTopic || session.topic],
        conversationEntries: [
          { role: 'interviewer', content: aiResponse.followUpQuestion },
        ],
        currentTopic: aiResponse.nextTopic || session.topic,
        currentDifficulty: aiResponse.difficulty || session.difficulty,
        followUpDepthLevel: 0,
        introductionCompleted: true,
        fundamentalsCompleted: false,
      });

      session.progress = {
        currentTopic: aiResponse.nextTopic || session.topic,
        followUpDepthLevel: 0,
        introductionCompleted: true,
        fundamentalsCompleted: false,
        questionCount: session.transcript.length,
        recentAverageScore: 0,
      };
      session.totalQuestions = session.transcript.length;
      session.lastActivityAt = new Date();
      await session.save();

      return {
        question: aiResponse.followUpQuestion,
        fallback: Boolean(aiResponse.fallback),
        remainingSeconds: timerService.getRemainingSeconds(session),
      };
    } catch (error) {
      logger.error(`Interview start error for session ${sessionId}: ${error.message}`);
      console.error('Interview Start Error:', error);
      throw error;
    }
  }
}

module.exports = new InterviewEngine();
