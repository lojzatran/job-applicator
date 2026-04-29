import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameProcessingRunStatusToInProgress1777453188000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "job_application_processing_run"
      SET "status" = 'in progress'
      WHERE "status" = 'processing'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "job_application_processing_run"
      SET "status" = 'processing'
      WHERE "status" = 'in progress'
    `);
  }
}
