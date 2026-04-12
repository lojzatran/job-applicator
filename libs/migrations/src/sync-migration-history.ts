import { syncMigrationHistory } from './sync-migration-history.lib';
import { createLogger } from '@apps/shared';

const logger = createLogger('sync-migration-history');

syncMigrationHistory().catch((error) => {
  logger.error(error);
  process.exit(1);
});
