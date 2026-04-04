import { ChatOllama } from '@langchain/ollama';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import {
  COVER_LETTER_GENERATOR_LLM,
  JOB_EVALUATOR_LLM,
  CRITIQUE_LLM,
  CV_PARSER_LLM,
  EMBEDDING_MODEL,
} from '../ai.constants';
import { env } from '../../../utils/env';
import { OllamaEmbeddings } from '@langchain/ollama';

function createJobEvaluatorLlm() {
  if (!env.JOB_EVALUATOR_MODEL) {
    throw new Error(
      'Missing JOB_EVALUATOR_MODEL configuration. Set JOB_EVALUATOR_MODEL before starting the API.',
    );
  }

  if (env.GEMINI_API_KEY) {
    return new ChatGoogleGenerativeAI({
      apiKey: env.GEMINI_API_KEY,
      model: env.JOB_EVALUATOR_MODEL,
    });
  } else {
    return new ChatOllama({
      model: env.JOB_EVALUATOR_MODEL,
      baseUrl: env.OLLAMA_BASE_URL,
      temperature: 0,
    });
  }
}

function createCoverLetterGeneratorLlm() {
  if (!env.OLLAMA_BASE_URL || !env.COVER_LETTER_GENERATOR_MODEL) {
    throw new Error(
      'Missing Ollama configuration. Set OLLAMA_BASE_URL and COVER_LETTER_GENERATOR_MODEL before starting the API.',
    );
  }

  return new ChatOllama({
    model: env.COVER_LETTER_GENERATOR_MODEL,
    baseUrl: env.OLLAMA_BASE_URL,
    temperature: 0.7,
  });
}

function createCritiqueLlm() {
  if (!env.CRITIQUE_MODEL || !env.OLLAMA_BASE_URL) {
    throw new Error(
      'Missing Ollama configuration. Set OLLAMA_BASE_URL and CRITIQUE_MODEL before starting the API.',
    );
  }

  return new ChatOllama({
    model: env.CRITIQUE_MODEL,
    baseUrl: env.OLLAMA_BASE_URL,
    temperature: 0.7,
  });
}

function createCvParserLlm() {
  if (env.GEMINI_API_KEY) {
    return new ChatGoogleGenerativeAI({
      apiKey: env.GEMINI_API_KEY,
      model: env.CV_PARSER_MODEL,
    });
  }

  return new ChatOllama({
    model: 'gemma3:12b',
    baseUrl: env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    temperature: 0,
  });
}

function embeddingModel() {
  const embeddingModel = new OllamaEmbeddings({
    model: env.EMBEDDING_MODEL,
    baseUrl: env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
  });

  return embeddingModel;
}

export const jobEvaluatorLlmProvider = {
  provide: JOB_EVALUATOR_LLM,
  useFactory: createJobEvaluatorLlm,
};

export const coverLetterGeneratorLlmProvider = {
  provide: COVER_LETTER_GENERATOR_LLM,
  useFactory: createCoverLetterGeneratorLlm,
};

export const critiqueLlmProvider = {
  provide: CRITIQUE_LLM,
  useFactory: createCritiqueLlm,
};

export const cvParserLlmProvider = {
  provide: CV_PARSER_LLM,
  useFactory: createCvParserLlm,
};

export const embeddingModelProvider = {
  provide: EMBEDDING_MODEL,
  useFactory: embeddingModel,
};