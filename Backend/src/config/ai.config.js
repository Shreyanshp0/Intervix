export default {
  groq: {
    primaryModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    fallbackModels: [
      'openai/gpt-oss-120b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
    ],
    generationConfig: {
      temperature: 0.7,
      maxCompletionTokens: 900,
      topP: 1,
      reasoningEffort: 'medium',
      stop: null,
    },
    runtime: {
      maxInputTokens: Number(process.env.GROQ_MAX_INPUT_TOKENS || 6500),
    },
  },
};
