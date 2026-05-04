import { resolve } from 'path';
import {
  combineEnvSchemas,
  createEnv,
  sharedEnvSchema,
} from '@apps/shared/env-utils';
import { z } from 'zod';

const workspaceEnvPath = resolve(process.cwd(), '.env');
const appEnvPath = resolve(process.cwd(), 'apps/website-e2e/.env');

const appEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string(),
  NEXT_PUBLIC_SUPABASE_URL: z.string(),
});

export const env = createEnv({
  envPaths: [workspaceEnvPath, appEnvPath],
  schema: combineEnvSchemas(sharedEnvSchema, appEnvSchema),
});
