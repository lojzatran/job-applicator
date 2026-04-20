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
  STORAGE_DIR: z.string(),
});

export const env = createEnv({
  envPaths: [workspaceEnvPath, websiteEnvPath],
  schema: combineEnvSchemas(sharedEnvSchema, websiteEnvSchema),
});
