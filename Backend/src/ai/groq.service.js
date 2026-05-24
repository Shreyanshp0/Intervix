const Groq = require('groq-sdk');
const logger = require('../config/logger');
const aiConfig = require('../config/ai.config');
const { safeJsonParse, extractJsonPayload } = require('../utils/ai-json.utils');
const { withTimeout } = require('../utils/async-timeout');
const {
  compactHistory,
  compactList,
  estimateTokens,
  pruneEmptyFields,
  supportsReasoningEffort,
  trimContextForTokens,
  shouldTrimForBudget,
} = require('./groq.utils');
const {
  GroqOperationalError,
  TokenLimitError,
  UnsupportedParameterError,
  ModelUnavailableError,
} = require('./groq.errors');

class GroqService {
  constructor() {
    this.modelName = aiConfig.groq.primaryModel;
    this.fallbackModels = aiConfig.groq.fallbackModels;
    this.generationConfig = aiConfig.groq.generationConfig;
    this.runtimeConfig = aiConfig.groq.runtime;
    this.requestTimeoutMs = Number(process.env.GROQ_TIMEOUT_MS || 20000);
    this.groq = null;
  }

  async generateInterviewAction(prompt, context) {
    try {
      const messages = this.buildInterviewMessages(prompt, context);
      const responseText = await this.generateWithFallback({
        task: 'interview',
        messages,
      });

      this.logInfo('Interview raw response', {
        preview: responseText.slice(0, 800),
      });

      if (!responseText || !responseText.trim()) {
        throw new GroqOperationalError('Groq returned empty interview response', {
          context,
        });
      }

      const parsed = this.parseInterviewResponse(responseText, context);
      this.logInfo('Interview parsed response', {
        preview: JSON.stringify(parsed).slice(0, 800),
      });
      return parsed;
    } catch (error) {
      this.logGroqError('Groq interview generation failed', error, {
        topic: context?.topic,
        difficulty: context?.difficulty,
      });
      throw error;
    }
  }

  async generateFinalReport(sessionData, memoryData) {
    try {
      const messages = this.buildFinalReportMessages(sessionData, memoryData);
      const responseText = await this.generateWithFallback({
        task: 'final-report',
        messages,
        options: {
          temperature: 0.3,
          maxCompletionTokens: 1200,
        },
      });

      if (!responseText || !responseText.trim()) {
        throw new GroqOperationalError('Groq returned empty final report response');
      }

      return this.parseJsonResponse(responseText, 'final report');
    } catch (error) {
      this.logGroqError('Groq report generation failed', error, {
        sessionId: sessionData?._id,
      });
      throw error;
    }
  }

  async generateAssessment({ session, transcript }) {
    try {
      const messages = this.buildAssessmentMessages(session, transcript);
      const responseText = await this.generateWithFallback({
        task: 'assessment',
        messages,
        options: {
          temperature: 0.2,
          maxCompletionTokens: 1800,
        },
      });

      if (!responseText || !responseText.trim()) {
        throw new GroqOperationalError('Groq returned empty assessment response');
      }

      return this.parseJsonResponse(responseText, 'assessment');
    } catch (error) {
      this.logGroqError('Groq assessment generation failed', error, {
        sessionId: session?._id,
      });
      throw error;
    }
  }

  buildInterviewMessages(prompt, context = {}) {
    const compactPrompt = [
      prompt,
      '',
      'Return valid JSON only with keys:',
      'technicalScore, communicationScore, confidenceScore, keywords, strongAreas, weakAreas, difficulty, followUpQuestion, nextTopic, interviewerTone.',
    ].join('\n');

    return [
      {
        role: 'system',
        content: 'You are an adaptive technical interviewer. Ask exactly one question at a time. Use previous answers for follow-ups. Challenge vague responses. Adjust difficulty dynamically. Return valid JSON only.',
      },
      {
        role: 'user',
        content: `${compactPrompt}\n\nContext:\n${JSON.stringify(context)}`,
      },
    ];
  }

  buildFinalReportMessages(sessionData, memoryData) {
    const reportContext = pruneEmptyFields({
      topic: sessionData?.topic,
      difficulty: sessionData?.difficulty,
      interviewType: sessionData?.interviewType,
      experienceLevel: sessionData?.experienceLevel,
      discussedTopics: compactList(memoryData?.discussedTopics, 6, 40),
      strengths: compactList(memoryData?.strongAreas, 6, 60),
      weaknesses: compactList(memoryData?.weakAreas, 6, 60),
      recentHistory: compactHistory(memoryData?.conversationHistory, 8),
    });

    return [
      {
        role: 'system',
        content: 'Generate a concise interview evaluation report. Return valid JSON only.',
      },
      {
        role: 'user',
        content: `Return JSON with keys: technicalScore, communicationScore, confidenceScore, detectedSkills, strengths, weaknesses, summary, improvementRecommendations.\n\nContext:\n${JSON.stringify(reportContext)}`,
      },
    ];
  }

  buildAssessmentMessages(session, transcript = []) {
    const transcriptPayload = transcript.map((entry, index) => ({
      index: index + 1,
      question: entry.question,
      answer: entry.answer,
      score: entry.score,
      difficultyAtTime: entry.difficultyAtTime,
    }));

    return [
      {
        role: 'system',
        content: [
          'You are an expert interview assessment engine.',
          'Evaluate the candidate using the full interview transcript.',
          'Return valid JSON only.',
          'Scores must be integers from 0 to 100.',
          'Required keys: overallScore, technicalScore, communicationScore, confidenceScore, problemSolvingScore, depthScore, strongAreas, weakAreas, suggestions, recommendedStudyTopics, hiringReadiness, finalSummary, transcriptFeedback.',
          'transcriptFeedback must be an array aligned to the transcript with keys: score and feedback.',
        ].join(' '),
      },
      {
        role: 'user',
        content: JSON.stringify({
          topic: session?.topic,
          difficulty: session?.difficulty,
          duration: session?.duration,
          interviewType: session?.interviewType,
          experienceLevel: session?.experienceLevel,
          transcript: transcriptPayload,
        }),
      },
    ];
  }

  async generateWithFallback({ task, messages, options = {} }) {
    const modelsToTry = [...new Set([this.modelName, ...this.fallbackModels])];
    const attempts = [];

    for (const model of modelsToTry) {
      try {
        const responseText = await this.executeModelWithRecovery({
          task,
          model,
          baseMessages: messages,
          options,
        });
        this.modelName = model;
        return responseText;
      } catch (error) {
        attempts.push({
          model,
          errorName: error.name,
          message: error.message,
          details: error.details,
        });

        this.logInfo(`Model failed: ${model}`, {
          task,
          errorName: error.name,
          message: error.message,
        });
      }
    }

    throw new GroqOperationalError('All configured Groq models failed', {
      task,
      configuredModels: modelsToTry,
      attempts,
    });
  }

  async executeModelWithRecovery({ task, model, baseMessages, options }) {
    let workingMessages = baseMessages.map((message) => ({ ...message }));
    let allowReasoningEffort = supportsReasoningEffort(model);
    let trimmedForBudget = false;
    let trimmedAfterProviderError = false;

    while (true) {
      if (shouldTrimForBudget(workingMessages, this.runtimeConfig.maxInputTokens)) {
        this.logInfo('Trimming history due to token budget', {
          model,
          task,
          estimatedTokens: estimateTokens(workingMessages),
        });
        const trimmedMessages = this.trimMessages(workingMessages);
        if (this.didMessagesChange(workingMessages, trimmedMessages)) {
          workingMessages = trimmedMessages;
        } else {
          throw new TokenLimitError('Unable to reduce request below the safe token budget', {
            model,
            task,
            estimatedTokens: estimateTokens(workingMessages),
            maxInputTokens: this.runtimeConfig.maxInputTokens,
          });
        }
        trimmedForBudget = true;
      }

      const estimatedTokens = estimateTokens(workingMessages);
      this.logInfo(`Using model: ${model}`, {
        task,
        estimatedTokens,
      });

      try {
        return await this.createChatCompletion({
          model,
          messages: workingMessages,
          options,
          allowReasoningEffort,
        });
      } catch (error) {
        const normalizedError = this.normalizeGroqError(error, {
          model,
          task,
          estimatedTokens,
          reasoningEffortIncluded: allowReasoningEffort,
        });

        if (normalizedError instanceof UnsupportedParameterError && allowReasoningEffort) {
          this.logInfo('Retrying without reasoning_effort', {
            model,
            task,
          });
          allowReasoningEffort = false;
          continue;
        }

        if (normalizedError instanceof TokenLimitError && !trimmedAfterProviderError) {
          this.logInfo('Retrying after token-limit trim', {
            model,
            task,
          });
          const trimmedMessages = this.trimMessages(workingMessages);
          if (!this.didMessagesChange(workingMessages, trimmedMessages)) {
            throw normalizedError;
          }
          workingMessages = trimmedMessages;
          trimmedAfterProviderError = true;
          continue;
        }

        if (normalizedError instanceof TokenLimitError && !trimmedForBudget) {
          const trimmedMessages = this.trimMessages(workingMessages);
          if (!this.didMessagesChange(workingMessages, trimmedMessages)) {
            throw normalizedError;
          }
          workingMessages = trimmedMessages;
          trimmedForBudget = true;
          continue;
        }

        throw normalizedError;
      }
    }
  }

  trimMessages(messages = []) {
    if (messages.length < 2) {
      return messages;
    }

    const nextMessages = [...messages];
    const userMessage = nextMessages[nextMessages.length - 1];

    if (userMessage?.role === 'user' && typeof userMessage.content === 'string') {
      const contextMarker = '\n\nContext:\n';
      const markerIndex = userMessage.content.indexOf(contextMarker);

      if (markerIndex !== -1) {
        const prefix = userMessage.content.slice(0, markerIndex + contextMarker.length);
        const rawContext = userMessage.content.slice(markerIndex + contextMarker.length);

        try {
          const parsedContext = JSON.parse(rawContext);
          const trimmedContext = trimContextForTokens(parsedContext);
          nextMessages[nextMessages.length - 1] = {
            ...userMessage,
            content: `${prefix}${JSON.stringify(trimmedContext)}`,
          };
          return nextMessages;
        } catch (error) {
          logger.warn(`[Groq] Failed to trim structured context: ${error.message}`);
        }
      }

      nextMessages[nextMessages.length - 1] = {
        ...userMessage,
        content: userMessage.content.slice(0, Math.max(400, userMessage.content.length - 500)),
      };
    }

    return nextMessages;
  }

  didMessagesChange(previousMessages = [], nextMessages = []) {
    return JSON.stringify(previousMessages) !== JSON.stringify(nextMessages);
  }

  async createChatCompletion({ model, messages, options = {}, allowReasoningEffort }) {
    const client = this.getClient();
    const requestConfig = this.buildRequestConfig({
      model,
      messages,
      options,
      allowReasoningEffort,
    });

    const responsePromise = (async () => {
      const stream = await client.chat.completions.create(requestConfig);
      let responseText = '';

      for await (const chunk of stream) {
        responseText += chunk.choices?.[0]?.delta?.content || '';
      }

      return responseText.trim();
    })();

    return withTimeout(responsePromise, {
      timeoutMs: this.requestTimeoutMs,
      timeoutMessage: 'Groq request timed out',
    });
  }

  buildRequestConfig({ model, messages, options, allowReasoningEffort }) {
    const requestConfig = {
      model,
      messages,
      temperature: options.temperature ?? this.generationConfig.temperature,
      max_completion_tokens: options.maxCompletionTokens ?? this.generationConfig.maxCompletionTokens,
      top_p: options.topP ?? this.generationConfig.topP,
      stream: true,
    };

    if (allowReasoningEffort && supportsReasoningEffort(model)) {
      requestConfig.reasoning_effort = options.reasoningEffort ?? this.generationConfig.reasoningEffort;
    }

    if ((options.stop ?? this.generationConfig.stop) != null) {
      requestConfig.stop = options.stop ?? this.generationConfig.stop;
    }

    return requestConfig;
  }

  getClient() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new GroqOperationalError('GROQ_API_KEY is missing. Check backend dotenv loading.', {
        keyExists: false,
        model: this.modelName,
      });
    }

    if (!this.groq) {
      this.groq = new Groq({ apiKey });
    }

    return this.groq;
  }

  parseInterviewResponse(responseText, context) {
    const parsedData = this.parseJsonResponse(responseText, 'interview action');
    const followUpQuestion = parsedData.followUpQuestion || parsedData.question;

    if (!followUpQuestion || typeof followUpQuestion !== 'string') {
      throw new GroqOperationalError('Groq response is missing followUpQuestion', {
        parsedData,
        topic: context?.topic,
      });
    }

    return {
      technicalScore: Number.isFinite(parsedData.technicalScore) ? parsedData.technicalScore : 0,
      communicationScore: Number.isFinite(parsedData.communicationScore) ? parsedData.communicationScore : 0,
      confidenceScore: Number.isFinite(parsedData.confidenceScore) ? parsedData.confidenceScore : 0,
      answerScore: Number.isFinite(parsedData.answerScore) ? parsedData.answerScore : Number.isFinite(parsedData.technicalScore) ? parsedData.technicalScore : 0,
      keywords: Array.isArray(parsedData.keywords) ? parsedData.keywords.slice(0, 6) : [],
      strongAreas: Array.isArray(parsedData.strongAreas) ? parsedData.strongAreas.slice(0, 4) : [],
      weakAreas: Array.isArray(parsedData.weakAreas) ? parsedData.weakAreas.slice(0, 4) : [],
      difficulty: parsedData.difficulty || context?.difficulty || 'medium',
      followUpQuestion: followUpQuestion.trim(),
      nextTopic: parsedData.nextTopic || context?.topic || 'technical interview',
      interviewerTone: parsedData.interviewerTone || 'neutral',
      fallback: Boolean(parsedData.fallback),
      feedback: typeof parsedData.feedback === 'string' ? parsedData.feedback : '',
    };
  }

  parseJsonResponse(rawText, label) {
    const parseResult = safeJsonParse(rawText);

    if (!parseResult.ok) {
      throw new GroqOperationalError(`Failed to parse Groq ${label} JSON`, {
        rawText: String(rawText || '').slice(0, 1200),
        cleanedText: String(parseResult.cleanedText || '').slice(0, 1200),
        parseError: parseResult.error?.message,
      });
    }

    return parseResult.value;
  }

  extractJson(rawText = '') {
    return extractJsonPayload(rawText);
  }

  normalizeGroqError(error, metadata = {}) {
    const message = String(error?.message || '').toLowerCase();
    const statusCode = error?.status || error?.statusCode || 500;
    const details = {
      ...metadata,
      statusCode,
      providerMessage: error?.message,
      response: error?.response?.data,
    };

    if (message.includes('reasoning_effort') && message.includes('unsupported')) {
      return new UnsupportedParameterError('reasoning_effort is unsupported for this model', details);
    }

    if (
      message.includes('token') && (message.includes('limit') || message.includes('exceed'))
      || message.includes('request too large')
    ) {
      return new TokenLimitError('Groq request exceeded the safe token limit', details);
    }

    if (
      statusCode === 404
      || statusCode === 429
      || statusCode >= 500
      || message.includes('model')
      && (message.includes('unavailable') || message.includes('decommissioned') || message.includes('not found'))
    ) {
      return new ModelUnavailableError('Groq model is unavailable for this request', details);
    }

    if (error instanceof GroqOperationalError) {
      return error;
    }

    return new GroqOperationalError(error?.message || 'Groq request failed', details, statusCode);
  }

  async listAvailableModels() {
    logger.warn('[Groq] Model listing is not implemented in this service.');
    return [];
  }

  logInfo(message, metadata = {}) {
    logger.info(`[Groq] ${message}${Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : ''}`);
  }

  logGroqError(message, error, context) {
    const detailSummary = {
      name: error.name,
      message: error.message,
      status: error.status || error.statusCode,
      details: error.details,
      model: this.modelName,
      context,
    };

    logger.error(`[Groq] ${message}: ${error.message}`);
    logger.error(`[Groq] Error details: ${JSON.stringify(detailSummary)}`);
  }
}

module.exports = new GroqService();
