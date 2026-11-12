import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProcessingRunLastUpdatedAt1794502236000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_application_processing_run"
      ADD COLUMN "lastUpdatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_application_processing_run"
      DROP COLUMN "lastUpdatedAt"
    `);
  }
}
