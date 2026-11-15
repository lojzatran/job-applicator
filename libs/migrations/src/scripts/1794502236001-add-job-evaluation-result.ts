import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobEvaluationResult1794502236001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "job_application_evaluation_result_enum" AS ENUM ('apply', 'uncertain', 'dismiss')`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_application" ADD COLUMN "evaluationResult" "job_application_evaluation_result_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_application_processing_run" ADD COLUMN "uncertainJobApplications" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_application_processing_run" DROP COLUMN "uncertainJobApplications"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_application" DROP COLUMN "evaluationResult"`,
    );
    await queryRunner.query(
      `DROP TYPE "job_application_evaluation_result_enum"`,
    );
  }
}
