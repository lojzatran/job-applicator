import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateJobApplication1774427783303 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_application" ADD COLUMN IF NOT EXISTS "source" varchar`,
    );

    await queryRunner.query(
      `UPDATE "job_application" SET "source" = 'startupjobs' WHERE "source" IS NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "job_application" ALTER COLUMN "source" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_application" DROP COLUMN "source"`,
    );
  }
}
