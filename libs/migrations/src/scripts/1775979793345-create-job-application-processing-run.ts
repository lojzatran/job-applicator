import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobApplicationProcessingRun1775979793345
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "job_application_processing_run" (
        "id" SERIAL NOT NULL,
        "status" varchar NOT NULL,
        "totalJobs" integer NOT NULL,
        "evaluatedJobApplications" integer NOT NULL,
        "dismissedJobApplications" integer NOT NULL,
        "appliedJobApplications" integer NOT NULL,
        "threadId" varchar NOT NULL,
        "createdAt" timestamp NOT NULL,
        CONSTRAINT "PK_job_application_processing_run" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "job_application_processing_run"`,
    );
  }
}
