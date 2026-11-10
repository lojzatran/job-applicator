import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobEmbedding1794311918513 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "job_embedding" (
        "id" SERIAL NOT NULL,
        "jobId" integer NOT NULL,
        "contentHash" varchar(64) NOT NULL,
        "model" varchar NOT NULL,
        "chunkIndex" integer NOT NULL,
        "embedding" vector NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_job_embedding" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_job_embedding_content_model_chunk" UNIQUE ("jobId", "contentHash", "model", "chunkIndex"),
        CONSTRAINT "FK_job_embedding_job" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "job_embedding"`);
  }
}
