import { resolve } from 'path';
import {
  combineEnvSchemas,
  createEnv,
  sharedEnvSchema,
} from '@apps/shared/env-utils';
import { z } from 'zod';

const workspaceEnvPath = resolve(process.cwd(), '.env');
const websiteEnvPath = resolve(process.cwd(), 'apps/website/.env');

const websiteEnvSchema = z.object({
  RABBITMQ_URL: z.string(),
  RABBITMQ_QUEUE_PROCESS: z.string().default('job_application.process'),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  STORAGE_DIR: z.string(),
});

export const env = createEnv({
  envPaths: [workspaceEnvPath, websiteEnvPath],
  schema: combineEnvSchemas(sharedEnvSchema, websiteEnvSchema),
});
