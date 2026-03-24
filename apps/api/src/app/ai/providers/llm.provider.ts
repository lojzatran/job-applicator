import { ChatOllama } from '@langchain/ollama';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { COVER_LETTER_GENERATOR_LLM, JOB_EVALUATOR_LLM } from '../ai.constants';
import { env } from '@apps/shared';

export const jobEvaluatorLlmProvider = {
  provide: JOB_EVALUATOR_LLM,
  useFactory: () => {
    return new ChatGoogleGenerativeAI({
      apiKey: env.GEMINI_API_KEY!,
      model: env.GEMINI_MODEL!,
      temperature: 0,
    });
  },
};

export const coverLetterGeneratorLlmProvider = {
  provide: COVER_LETTER_GENERATOR_LLM,
  useFactory: () => {
    return new ChatOllama({
      model: env.OLLAMA_CHAT_MODEL,
      baseUrl: env.OLLAMA_BASE_URL,
      temperature: 0.7,
    });
  },
};
