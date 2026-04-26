import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetDefaultCreatedAtForAllTables1777234100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cv" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );

    await queryRunner.query(
      `ALTER TABLE "job" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_application" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_application_processing_run" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_embedding" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cv" ALTER COLUMN "createdAt" DROP DEFAULT`,
    );

    await queryRunner.query(
      `ALTER TABLE "job" ALTER COLUMN "createdAt" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_application" ALTER COLUMN "createdAt" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_application_processing_run" ALTER COLUMN "createdAt" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_embedding" ALTER COLUMN "createdAt" DROP DEFAULT`,
    );
  }
}
