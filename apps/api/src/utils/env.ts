import { env as sharedEnv } from '@apps/shared';
import { config as loadDotEnv } from 'dotenv';
import { resolve } from 'path';
import { z } from 'zod';

const appEnvPath = resolve(process.cwd(), 'apps/api/.env');

loadDotEnv({ path: appEnvPath, override: true });

const appEnvSchema = z.object({
  EMBEDDING_MODEL: z.string(),
  CV_PARSER_MODEL: z.string(),
});

const skipValidation = process.env.SKIP_ENV_VALIDATION === 'true';

const appEnv = skipValidation
  ? (process.env as unknown as z.infer<typeof appEnvSchema>)
  : appEnvSchema.parse(process.env);

export const env = {
  ...sharedEnv,
  ...appEnv,
};
