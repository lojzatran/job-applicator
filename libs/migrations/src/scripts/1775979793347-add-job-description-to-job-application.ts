import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobDescriptionToJobApplication1775979793347
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_application" ADD COLUMN IF NOT EXISTS "jobDescription" varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_application" DROP COLUMN IF EXISTS "jobDescription"`,
    );
  }
}
