import { resolve } from 'path';
import { combineEnvSchemas, createEnv, sharedEnvSchema } from '@apps/shared/env-utils';
import { z } from 'zod';

const workspaceEnvPath = resolve(process.cwd(), '.env');
const appEnvPath = resolve(process.cwd(), 'apps/api/.env');

const appEnvSchema = z.object({
  EMBEDDING_MODEL: z.string(),
  CV_PARSER_MODEL: z.string(),
});

export const env = createEnv({
  envPaths: [workspaceEnvPath, appEnvPath],
  schema: combineEnvSchemas(sharedEnvSchema, appEnvSchema),
});
