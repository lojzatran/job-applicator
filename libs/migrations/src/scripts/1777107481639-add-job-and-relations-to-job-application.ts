import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobAndRelationsToJobApplication1777107481639
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "job" (
        "id" SERIAL NOT NULL,
        "url" varchar NOT NULL,
        "title" varchar NOT NULL,
        "company" varchar NOT NULL,
        "description" varchar NOT NULL,
        "source" varchar NOT NULL,
        "createdAt" timestamp NOT NULL,
        CONSTRAINT "PK_job" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_job_url" UNIQUE ("url")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "job_application"
      ADD COLUMN IF NOT EXISTS "jobId" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "job_application"
      ADD COLUMN IF NOT EXISTS "cvId" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "job_application"
      ADD COLUMN IF NOT EXISTS "status" varchar DEFAULT 'processing'
    `);

    await queryRunner.query(`
      ALTER TABLE "job_application"
      ADD COLUMN IF NOT EXISTS "reason" varchar
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_job_application_job') THEN
          ALTER TABLE "job_application"
          ADD CONSTRAINT "FK_job_application_job" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_job_application_cv') THEN
          ALTER TABLE "job_application"
          ADD CONSTRAINT "FK_job_application_cv" FOREIGN KEY ("cvId") REFERENCES "cv"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_job_application_jobId" ON "job_application" ("jobId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_job_application_cvId" ON "job_application" ("cvId")
    `);

    await queryRunner.query(`
      ALTER TABLE "job_application"
      DROP COLUMN IF EXISTS "job",
      DROP COLUMN IF EXISTS "url",
      DROP COLUMN IF EXISTS "source",
      DROP COLUMN IF EXISTS "jobDescription"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_application"
      ADD COLUMN IF NOT EXISTS "job" jsonb,
      ADD COLUMN IF NOT EXISTS "url" varchar,
      ADD COLUMN IF NOT EXISTS "source" varchar,
      ADD COLUMN IF NOT EXISTS "jobDescription" varchar
    `);
    await queryRunner.query(`
      ALTER TABLE "job_application"
      DROP COLUMN IF EXISTS "status",
      DROP COLUMN IF EXISTS "reason"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_job_application_cvId"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_job_application_jobId"
    `);

    await queryRunner.query(`
      ALTER TABLE "job_application"
      DROP CONSTRAINT IF EXISTS "FK_job_application_cv"
    `);

    await queryRunner.query(`
      ALTER TABLE "job_application"
      DROP CONSTRAINT IF EXISTS "FK_job_application_job"
    `);

    await queryRunner.query(`
      ALTER TABLE "job_application"
      DROP COLUMN IF EXISTS "cvId"
    `);

    await queryRunner.query(`
      ALTER TABLE "job_application"
      DROP COLUMN IF EXISTS "jobId"
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "job"`);
  }
}
