import { existsSync, readFileSync } from 'fs';
import { parse } from 'dotenv';
import { z } from 'zod';

interface ParseableSchema<TEnv> {
  parse(data: unknown): TEnv;
}

interface CreateEnvOptions<TEnv> {
  envPaths: string[];
  schema: ParseableSchema<TEnv>;
  skipValidation?: boolean;
}

const sharedEnvShape = {
  POSTGRES_HOST: z.string(),
  POSTGRES_PORT: z.coerce.number(),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  ENABLE_QUERY_LOG: z.coerce.boolean().default(false),
  LOGS_DIR: z.string().default(`${process.cwd()}/logs`),
};

function loadEnvFile(path: string) {
  return existsSync(path) ? parse(readFileSync(path)) : {};
}

function loadEnvFiles(paths: string[]) {
  return paths.reduce<Record<string, string>>(
    (loadedEnv, path) => ({ ...loadedEnv, ...loadEnvFile(path) }),
    {},
  );
}

export const sharedEnvSchema = z.object(sharedEnvShape);

export function combineEnvSchemas<TBase, TExtra>(
  baseSchema: ParseableSchema<TBase>,
  extraSchema: ParseableSchema<TExtra>,
): ParseableSchema<TBase & TExtra> {
  return {
    parse(data: unknown) {
      return {
        ...baseSchema.parse(data),
        ...extraSchema.parse(data),
      } as TBase & TExtra;
    },
  };
}

export function createEnv<TEnv>({
  envPaths,
  schema,
}: CreateEnvOptions<TEnv>): TEnv {
  const skipValidation = process.env.SKIP_ENV_VALIDATION === 'true';
  const initialEnv = { ...process.env };
  const loadedEnv = loadEnvFiles(envPaths);

  // Shell env wins, then app env files in the order they were provided.
  Object.assign(process.env, loadedEnv, initialEnv);

  if (skipValidation) {
    try {
      return schema.parse(process.env);
    } catch {
      // If validation fails but we want to skip it, we return process.env as TEnv
      // This allows the app to start even with missing/invalid env vars in some environments (like CI build)
      return process.env as unknown as TEnv;
    }
  }

  return schema.parse(process.env);
}
