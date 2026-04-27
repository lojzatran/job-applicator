import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobApplication1774427783302 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "job_application" (
        "id" SERIAL NOT NULL,
        "url" varchar NOT NULL,
        "coverLetter" varchar,
        "source" varchar NOT NULL,
        "createdAt" timestamp NOT NULL,
        CONSTRAINT "PK_job_application" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_job_application_url" UNIQUE ("url")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "job_application"`);
  }
}
