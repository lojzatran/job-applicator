import { ChatOllama } from '@langchain/ollama';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { COVER_LETTER_GENERATOR_LLM, JOB_EVALUATOR_LLM } from '../ai.constants';
import { env } from '@apps/shared';

function createJobEvaluatorLlm() {
  if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL) {
    throw new Error(
      'Missing Gemini configuration. Set GEMINI_API_KEY and GEMINI_MODEL before starting the API.',
    );
  }

  return new ChatGoogleGenerativeAI({
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
  });
}

function createCoverLetterGeneratorLlm() {
  if (!env.OLLAMA_BASE_URL || !env.OLLAMA_CHAT_MODEL) {
    throw new Error(
      'Missing Ollama configuration. Set OLLAMA_BASE_URL and OLLAMA_CHAT_MODEL before starting the API.',
    );
  }

  return new ChatOllama({
    model: env.OLLAMA_CHAT_MODEL,
    baseUrl: env.OLLAMA_BASE_URL,
    temperature: 0.7,
  });
}

export const jobEvaluatorLlmProvider = {
  provide: JOB_EVALUATOR_LLM,
  useFactory: createJobEvaluatorLlm,
};

export const coverLetterGeneratorLlmProvider = {
  provide: COVER_LETTER_GENERATOR_LLM,
  useFactory: createCoverLetterGeneratorLlm,
};
