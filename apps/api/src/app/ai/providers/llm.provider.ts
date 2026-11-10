import { ChatOllama } from '@langchain/ollama';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import {
  COVER_LETTER_GENERATOR_LLM,
  JOB_EVALUATOR_LLM,
  CRITIQUE_LLM,
  CV_PARSER_LLM,
} from '../ai.constants';
import { env } from '../../../utils/env';
import { ChatOpenAI } from '@langchain/openai';

function createOllamaHeaders(): Record<string, string> {
  return env.OLLAMA_API_KEY
    ? { Authorization: `Bearer ${env.OLLAMA_API_KEY}` }
    : {};
}

function createOllamaLlm(model: string, temperature: number): ChatOllama {
  return new ChatOllama({
    model,
    baseUrl: env.OLLAMA_BASE_URL,
    headers: createOllamaHeaders(),
    temperature,
  });
}

function createAIGatewayLlm(model: string) {
  return new ChatOpenAI({
    apiKey: env.AI_GATEWAY_API_KEY,
    modelName: model,
    configuration: {
      baseURL: 'https://ai-gateway.vercel.sh/v1',
    },
  });
}

function createJobEvaluatorLlm() {
  const provider = env.JOB_EVALUATOR_PROVIDER;
  if ((!provider || provider === 'gemini') && env.GEMINI_API_KEY) {
    return new ChatGoogleGenerativeAI({
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_JOB_EVALUATOR_MODEL,
    });
  }
  if ((!provider || provider === 'ollama') && env.OLLAMA_JOB_EVALUATOR_MODEL) {
    return createOllamaLlm(env.OLLAMA_JOB_EVALUATOR_MODEL, 0);
  }

  if (
    (!provider || provider === 'ai_gateway') &&
    env.AI_GATEWAY_API_KEY &&
    env.AI_GATEWAY_JOB_EVALUATOR_MODEL
  ) {
    return createAIGatewayLlm(env.AI_GATEWAY_JOB_EVALUATOR_MODEL);
  }

  throw new Error(
    'Missing job evaluator configuration. Configure job evalutor API credentials before starting the API.',
  );
}

function createCoverLetterGeneratorLlm() {
  const provider = env.COVER_LETTER_GENERATOR_PROVIDER;
  if (
    (!provider || provider === 'ollama') &&
    env.OLLAMA_BASE_URL &&
    env.COVER_LETTER_GENERATOR_MODEL
  ) {
    return createOllamaLlm(env.COVER_LETTER_GENERATOR_MODEL, 0.7);
  }

  if (
    (!provider || provider === 'ai_gateway') &&
    env.AI_GATEWAY_API_KEY &&
    env.AI_GATEWAY_COVER_LETTER_GENERATOR_MODEL
  ) {
    return createAIGatewayLlm(env.AI_GATEWAY_COVER_LETTER_GENERATOR_MODEL);
  }

  throw new Error(
    'Missing cover letter generator configuration. Set OLLAMA_BASE_URL and COVER_LETTER_GENERATOR_MODEL or AI_GATEWAY_API_KEY and AI_GATEWAY_COVER_LETTER_GENERATOR_MODEL before starting the API.',
  );
}

function createCritiqueLlm() {
  const provider = env.CRITIQUE_PROVIDER;
  if (
    (!provider || provider === 'ollama') &&
    env.CRITIQUE_MODEL &&
    env.OLLAMA_BASE_URL
  ) {
    return createOllamaLlm(env.CRITIQUE_MODEL, 0.7);
  }

  if (
    (!provider || provider === 'ai_gateway') &&
    env.AI_GATEWAY_API_KEY &&
    env.AI_GATEWAY_CRITIQUE_MODEL
  ) {
    return createAIGatewayLlm(env.AI_GATEWAY_CRITIQUE_MODEL);
  }

  throw new Error(
    'Missing critique configuration. Set OLLAMA_BASE_URL and CRITIQUE_MODEL or AI_GATEWAY_API_KEY and AI_GATEWAY_CRITIQUE_MODEL before starting the API.',
  );
}

function createCvParserLlm() {
  const provider = env.CV_PARSER_PROVIDER;
  if ((!provider || provider === 'gemini') && env.GEMINI_API_KEY) {
    return new ChatGoogleGenerativeAI({
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_CV_PARSER_MODEL,
    });
  }

  if (
    (!provider || provider === 'ollama') &&
    env.CV_PARSER_MODEL &&
    env.OLLAMA_BASE_URL
  ) {
    return createOllamaLlm(env.CV_PARSER_MODEL, 0);
  }

  if (
    (!provider || provider === 'ai_gateway') &&
    env.AI_GATEWAY_API_KEY &&
    env.AI_GATEWAY_CV_PARSER_MODEL
  ) {
    return createAIGatewayLlm(env.AI_GATEWAY_CV_PARSER_MODEL);
  }

  throw new Error(
    'Missing CV parser configuration. Set GEMINI_API_KEY, OLLAMA_BASE_URL and CV_PARSER_MODEL or AI_GATEWAY_API_KEY and AI_GATEWAY_CV_PARSER_MODEL before starting the API.',
  );
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
