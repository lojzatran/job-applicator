import { readdirSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { Pool } from 'pg';
import type { MigrationInterface } from 'typeorm';
import { createLogger } from '@apps/shared/pinoLogger';
import { env } from '@apps/shared/env';

export interface MigrationRecord {
  timestamp: string;
  name: string;
}

export type MigrationDirectoryReader = (path: string) => readonly string[];
export type MigrationModuleImporter = (
  path: string,
) => Promise<Record<string, unknown>>;
export type MigrationClass = new () => MigrationInterface;

const logger = createLogger('sync-migration-history');
const defaultReadDir: MigrationDirectoryReader = (path) => readdirSync(path);
const defaultImportModule: MigrationModuleImporter = async (path) =>
  import(pathToFileURL(path).href);

export function buildMigrationRecord(fileName: string): MigrationRecord {
  const match = fileName.match(/^(\d+)-(.+)\.(?:ts|js)$/);

  if (!match) {
    throw new Error(`Unexpected migration file name: ${fileName}`);
  }

  const [, timestamp, slug] = match;

  return {
    timestamp,
    name: `${slug
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')}${timestamp}`,
  };
}

export function getExpectedMigrationRecords(
  migrationsDirectory = resolve(process.cwd(), 'libs/migrations/src/scripts'),
  readDir: MigrationDirectoryReader = defaultReadDir,
): MigrationRecord[] {
  return readDir(migrationsDirectory)
    .filter((fileName) => fileName.endsWith('.ts') || fileName.endsWith('.js'))
    .map((fileName) => buildMigrationRecord(fileName))
    .sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
}

export function getExpectedMigrationFileNames(
  migrationsDirectory = resolve(process.cwd(), 'libs/migrations/src/scripts'),
  readDir: MigrationDirectoryReader = defaultReadDir,
): string[] {
  return readDir(migrationsDirectory)
    .filter((fileName) => fileName.endsWith('.ts') || fileName.endsWith('.js'))
    .sort(
      (left, right) =>
        Number(buildMigrationRecord(left).timestamp) -
        Number(buildMigrationRecord(right).timestamp),
    );
}

export async function loadMigrationClasses(
  migrationsDirectory = resolve(process.cwd(), 'libs/migrations/src/scripts'),
  readDir: MigrationDirectoryReader = defaultReadDir,
  importModule: MigrationModuleImporter = defaultImportModule,
): Promise<MigrationClass[]> {
  const migrationFileNames = getExpectedMigrationFileNames(
    migrationsDirectory,
    readDir,
  );

  const migrationClasses: MigrationClass[] = [];

  for (const fileName of migrationFileNames) {
    const migrationRecord = buildMigrationRecord(fileName);
    const migrationPath = resolve(migrationsDirectory, fileName);

    let moduleExports: Record<string, unknown>;

    try {
      moduleExports = await importModule(migrationPath);
    } catch (error) {
      throw new Error(
        `Failed to load migration module "${fileName}" from "${migrationPath}".`,
        {
          cause: error,
        },
      );
    }

    const migrationClass = moduleExports[migrationRecord.name];

    if (typeof migrationClass !== 'function') {
      const availableExports = Object.keys(moduleExports);
      throw new Error(
        [
          `Migration "${fileName}" must export a class named "${migrationRecord.name}".`,
          `Available exports: ${availableExports.length > 0 ? availableExports.join(', ') : '(none)'}`,
        ].join(' '),
      );
    }

    migrationClasses.push(migrationClass as MigrationClass);
  }

  return migrationClasses;
}

export function areMigrationRecordsEqual(
  left: MigrationRecord[],
  right: MigrationRecord[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every(
    (record, index) =>
      record.timestamp === right[index]?.timestamp &&
      record.name === right[index]?.name,
  );
}

export async function syncMigrationHistory(): Promise<void> {
  const expectedRecords = getExpectedMigrationRecords();
  const pool = new Pool({
    host: env.POSTGRES_HOST,
    port: Number(env.POSTGRES_PORT),
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
  });

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(`CREATE TABLE IF NOT EXISTS "migrations" (
        "id" SERIAL NOT NULL,
        "timestamp" bigint NOT NULL,
        "name" character varying NOT NULL,
        CONSTRAINT "PK_migrations" PRIMARY KEY ("id")
      )`);

      const existingHistory = await client.query<MigrationRecord>(`
        SELECT "timestamp"::text AS "timestamp", "name"
        FROM "migrations"
        ORDER BY "id" ASC
      `);

      if (areMigrationRecordsEqual(existingHistory.rows, expectedRecords)) {
        await client.query('COMMIT');
        logger.info('Migration history is already in sync.');
        return;
      }

      await client.query(`TRUNCATE TABLE "migrations" RESTART IDENTITY`);

      for (const record of expectedRecords) {
        await client.query(
          `INSERT INTO "migrations" ("timestamp", "name") VALUES ($1, $2)`,
          [record.timestamp, record.name],
        );
      }

      await client.query('COMMIT');
      logger.info('Migration history synchronized.');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
