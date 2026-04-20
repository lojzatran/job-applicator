import 'reflect-metadata';

import { DataSource } from 'typeorm';
import { createLogger } from '@apps/shared/pinoLogger';
import { env } from '@apps/shared/env';
import {
  loadMigrationClasses,
  syncMigrationHistory,
} from './sync-migration-history.lib';

const logger = createLogger('migrate');

async function migrate() {
  const migrationClasses = await loadMigrationClasses();
  const dataSource = new DataSource({
    type: 'postgres',
    schema: 'public',
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    username: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
    synchronize: false,
    logging: ['error'],
    migrations: migrationClasses,
  });

  try {
    await dataSource.initialize();
    await dataSource.runMigrations();
    await syncMigrationHistory();
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

migrate().catch((error) => {
  logger.error(error);
  process.exit(1);
});
