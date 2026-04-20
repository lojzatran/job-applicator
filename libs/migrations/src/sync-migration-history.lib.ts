import { readdirSync } from 'fs';
import { resolve } from 'path';
import { Pool } from 'pg';
import { env } from '../../shared/src/lib/utils/env';
import { createLogger } from '../../shared/src/lib/logger/pinoLogger';

export interface MigrationRecord {
  timestamp: string;
  name: string;
}

export type MigrationDirectoryReader = (path: string) => readonly string[];

const logger = createLogger('sync-migration-history');
const defaultReadDir: MigrationDirectoryReader = (path) => readdirSync(path);

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
