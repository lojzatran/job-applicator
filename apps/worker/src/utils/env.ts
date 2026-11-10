import { resolve } from 'path';
import {
  combineEnvSchemas,
  createEnv,
  sharedEnvSchema,
} from '@apps/shared/env-utils';
import { z } from 'zod';

const workspaceEnvPath = resolve(process.cwd(), '.env');

const appEnvSchema = z.object({
  JOB_EVALUATOR_PROVIDER: z.enum(['gemini', 'ollama', 'ai_gateway']).optional(),
  CV_PARSER_PROVIDER: z.enum(['gemini', 'ollama', 'ai_gateway']).optional(),
  COVER_LETTER_GENERATOR_PROVIDER: z.enum(['ollama', 'ai_gateway']).optional(),
  CRITIQUE_PROVIDER: z.enum(['ollama', 'ai_gateway']).optional(),
  AI_GATEWAY_API_KEY: z.string().optional(),
  AI_GATEWAY_JOB_EVALUATOR_MODEL: z.string().optional(),
  AI_GATEWAY_COVER_LETTER_GENERATOR_MODEL: z.string().optional(),
  AI_GATEWAY_CRITIQUE_MODEL: z.string().optional(),
  AI_GATEWAY_CV_PARSER_MODEL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().optional(),
  OLLAMA_API_KEY: z.string().optional(),
  OLLAMA_EMBEDDING_BASE_URL: z.string().optional(),
  OLLAMA_EMBEDDING_MODEL: z.string().default('nomic-embed-text-v2-moe:latest'),
  GEMINI_CV_PARSER_MODEL: z.string().default('gemini-3.1-flash-lite-preview'),
  CV_PARSER_MODEL: z.string().optional(),
  GEMINI_JOB_EVALUATOR_MODEL: z
    .string()
    .default('gemini-3.1-flash-lite-preview'),
  OLLAMA_JOB_EVALUATOR_MODEL: z.string().optional(),
  GEMINI_COVER_LETTER_GENERATOR_MODEL: z
    .string()
    .default('gemini-3.1-flash-lite-preview'),
  COVER_LETTER_GENERATOR_MODEL: z.string().optional(),
  GEMINI_CRITIQUE_MODEL: z.string().default('gemini-3.1-flash-lite-preview'),
  COHERE_API_KEY: z.string().optional(),
  COHERE_EMBEDDING_MODEL: z.string().default('embed-v4.0'),
  CRITIQUE_MODEL: z.string().optional(),
  RABBITMQ_URL: z.string(),
  RABBITMQ_QUEUE_PROCESS: z.string().default('job_application.process'),
  STORAGE_DIR: z.string(),
});

export const env = createEnv({
  envPaths: [workspaceEnvPath],
  schema: combineEnvSchemas(sharedEnvSchema, appEnvSchema),
});
