import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToJobApplicationRelatedTables1777361579882
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv"
      ADD COLUMN IF NOT EXISTS "userId" varchar
    `);

    await queryRunner.query(`
      ALTER TABLE "job_application"
      ADD COLUMN IF NOT EXISTS "userId" varchar
    `);

    await queryRunner.query(`
      ALTER TABLE "job_application_processing_run"
      ADD COLUMN IF NOT EXISTS "userId" varchar
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv"
      DROP COLUMN IF EXISTS "userId"
    `);

    await queryRunner.query(`
      ALTER TABLE "job_application"
      DROP COLUMN IF EXISTS "userId"
    `);

    await queryRunner.query(`
      ALTER TABLE "job_application_processing_run"
      DROP COLUMN IF EXISTS "userId"
    `);
  }
}
