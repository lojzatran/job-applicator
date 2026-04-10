import { Pool } from 'pg';
import { env, createLogger } from '@apps/shared';

const logger = createLogger('reset-database');

async function resetDatabase() {
  const pool = new Pool({
    host: env.POSTGRES_HOST,
    port: Number(env.POSTGRES_PORT),
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
  });

  try {
    await pool.query('CREATE SCHEMA IF NOT EXISTS public');

    await pool.query(`
      DO $$
      DECLARE
        table_name text;
      BEGIN
        FOR table_name IN
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename NOT IN ('migrations', 'typeorm_metadata')
        LOOP
          EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', table_name);
        END LOOP;
      END
      $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename = 'migrations'
        ) THEN
          EXECUTE 'TRUNCATE TABLE "migrations" RESTART IDENTITY CASCADE';
        END IF;
      END
      $$;
    `);
  } finally {
    await pool.end();
  }
}

resetDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});
