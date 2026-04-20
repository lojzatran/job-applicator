import { Pool } from 'pg';
import { createLogger } from '@apps/shared/pinoLogger';
import { env } from '@apps/shared/env';

const logger = createLogger('ensure-database');

async function ensureDatabase() {
  const targetDatabase = env.POSTGRES_DB;
  const pool = new Pool({
    host: env.POSTGRES_HOST,
    port: Number(env.POSTGRES_PORT),
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: 'postgres',
  });

  try {
    const existingDatabase = await pool.query<{ exists: boolean }>(
      `
        SELECT EXISTS(
          SELECT 1
          FROM pg_database
          WHERE datname = $1
        ) AS exists
      `,
      [targetDatabase],
    );

    if (!existingDatabase.rows[0]?.exists) {
      await pool.query(`CREATE DATABASE "${targetDatabase}"`);
    }
  } finally {
    await pool.end();
  }
}

ensureDatabase().catch((error) => {
  logger.error(error);
  process.exit(1);
});
