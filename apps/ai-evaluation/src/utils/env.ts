import { env as sharedEnv } from '@apps/shared';
import { config as loadDotEnv } from 'dotenv';
import { resolve } from 'path';
import { z } from 'zod';

const appEnvPath = resolve(process.cwd(), 'apps/ai-evaluation/.env');

loadDotEnv({ path: appEnvPath, override: true });

const appEnvSchema = z.object({
  GEMINI_API_KEY: z.string().optional(),
  GRADER_LLM_MODEL: z.string(),
  DATASET_NAME: z.string().optional(),
  OLLAMA_BASE_URL: z.string().optional(),
});

const skipValidation = process.env.SKIP_ENV_VALIDATION === 'true';

const appEnv = skipValidation
  ? (process.env as unknown as z.infer<typeof appEnvSchema>)
  : appEnvSchema.parse(process.env);

export const env = {
  ...sharedEnv,
  ...appEnv,
};
