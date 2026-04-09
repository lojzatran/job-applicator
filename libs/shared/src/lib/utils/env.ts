import { resolve } from 'path';
import { createEnv, sharedEnvSchema } from './env-utils';

const workspaceEnvPath = resolve(process.cwd(), '.env');

export const env = createEnv({
  envPaths: [workspaceEnvPath],
  schema: sharedEnvSchema,
});
