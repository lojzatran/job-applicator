import { resolve } from 'path';
import {
  combineEnvSchemas,
  createEnv,
  sharedEnvSchema,
} from '@apps/shared/env-utils';
import { z } from 'zod';

const workspaceEnvPath = resolve(process.cwd(), '.env');
const appEnvPath = resolve(process.cwd(), 'apps/ai-evaluation/.env');

const appEnvSchema = z.object({
  GEMINI_API_KEY: z.string().optional(),
  GRADER_LLM_MODEL: z.string(),
  DATASET_NAME: z.string().optional(),
  OLLAMA_BASE_URL: z.string().optional(),
  EMBEDDING_MODEL: z.string(),
});

export const env = createEnv({
  envPaths: [workspaceEnvPath, appEnvPath],
  schema: combineEnvSchemas(sharedEnvSchema, appEnvSchema),
});
