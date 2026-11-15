import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProcessingRunStatusCheck1794502236003
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_application_processing_run"
      ADD CONSTRAINT "CHK_job_application_processing_run_status"
      CHECK ("status" IN ('pending', 'in progress', 'completed', 'failed', 'skipped'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_application_processing_run"
      DROP CONSTRAINT "CHK_job_application_processing_run_status"
    `);
  }
}
