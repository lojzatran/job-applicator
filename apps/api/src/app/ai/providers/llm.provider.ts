import { ChatOllama } from '@langchain/ollama';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { COVER_LETTER_GENERATOR_LLM, JOB_EVALUATOR_LLM } from '../ai.constants';

export const jobEvaluatorLlmProvider = {
  provide: JOB_EVALUATOR_LLM,
  useFactory: () => {
    return new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_LLM_KEY,
      model: 'gemini-3.1-flash-lite-preview',
      temperature: 0,
    });
  },
};

export const coverLetterGeneratorLlmProvider = {
  provide: COVER_LETTER_GENERATOR_LLM,
  useFactory: () => {
    return new ChatOllama({
      model: 'deepseek-v3.1:671b-cloud',
      temperature: 0.7,
    });
  },
};
