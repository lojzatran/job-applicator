import { config as loadDotEnv } from 'dotenv';
import { resolve } from 'path';
import { z } from 'zod';

const appRoot = process.cwd();
const workspaceEnvPath = resolve(appRoot, '../../.env');
const appEnvPath = resolve(appRoot, '.env');

// Load the workspace env first, then let the current app override it.
loadDotEnv({ path: workspaceEnvPath });
loadDotEnv({ path: appEnvPath, override: true });

if (!process.env.GEMINI_API_KEY && process.env.GEMINI_LLM_KEY) {
  process.env.GEMINI_API_KEY = process.env.GEMINI_LLM_KEY;
}

const envSchema = z.object({
  GEMINI_API_KEY: z.string().optional(),
  POSTGRES_HOST: z.string(),
  POSTGRES_PORT: z.coerce.number(),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),
  RABBITMQ_URL: z.string(),
  RABBITMQ_QUEUE: z.string(),
  OLLAMA_BASE_URL: z.string().optional(),
  JOB_EVALUATOR_MODEL: z.string().optional(),
  COVER_LETTER_GENERATOR_MODEL: z.string().optional(),
  CRITIQUE_MODEL: z.string().optional(),
});

const skipValidation = process.env.SKIP_ENV_VALIDATION === 'true';

export const env = skipValidation
  ? (process.env as unknown as z.infer<typeof envSchema>)
  : envSchema.parse(process.env);
