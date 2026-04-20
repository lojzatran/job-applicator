import { DataSource } from 'typeorm';
import { createLogger } from '../../shared/src/lib/logger/pinoLogger';
import { env } from '../../shared/src/lib/utils/env';
import { syncMigrationHistory } from './sync-migration-history.lib';
import { AddHashToCv1774681794560 } from './scripts/1774681794560-add-hash-to-cv';
import { AddUniqueIndexToCvHash1774681794561 } from './scripts/1774681794561-add-unique-index-to-cv-hash';
import { AddUniqueThreadIdToJobApplicationProcessingRun1775979793346 } from './scripts/1775979793346-add-unique-thread-id-to-job-application-processing-run';
import { CreateCvAndCvEmbedding1774681794559 } from './scripts/1774681794559-create-cv-and-cv-embedding';
import { CreateJobApplication1774427783302 } from './scripts/1774427783302-create-job-application';
import { CreateJobApplicationProcessingRun1775979793345 } from './scripts/1775979793345-create-job-application-processing-run';
import { UpdateJobApplication1774427783303 } from './scripts/1774427783303-update-job-application';

const logger = createLogger('migrate');

async function migrate() {
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
    migrations: [
      CreateJobApplication1774427783302,
      UpdateJobApplication1774427783303,
      CreateCvAndCvEmbedding1774681794559,
      AddHashToCv1774681794560,
      AddUniqueIndexToCvHash1774681794561,
      CreateJobApplicationProcessingRun1775979793345,
      AddUniqueThreadIdToJobApplicationProcessingRun1775979793346,
    ],
  });

  try {
    await dataSource.initialize();
    await dataSource.runMigrations();
    await syncMigrationHistory();
  } finally {
    await dataSource.destroy();
  }
}

migrate().catch((error) => {
  logger.error(error);
  process.exit(1);
});
