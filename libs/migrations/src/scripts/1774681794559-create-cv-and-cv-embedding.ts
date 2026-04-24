import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCvAndCvEmbedding1774681794559 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cv" (
        "id" SERIAL NOT NULL,
        "path" varchar NOT NULL,
        "rawText" varchar NOT NULL,
        "createdAt" timestamp NOT NULL,
        CONSTRAINT "PK_cv" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cv_embedding" (
        "id" SERIAL NOT NULL,
        "embedding" vector NOT NULL,
        "weight" float NOT NULL,
        "model" varchar NOT NULL,
        "cvId" integer NOT NULL,
        "createdAt" timestamp NOT NULL,
        CONSTRAINT "PK_cv_embedding" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cv_embedding_cv" FOREIGN KEY ("cvId") REFERENCES "cv"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cv_embedding_cvId" ON "cv_embedding" ("cvId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cv_embedding_embedding_cosine_hnsw_cohere"
      ON "cv_embedding" USING hnsw ((embedding::vector(1536)) vector_cosine_ops)
      WHERE model = 'embed-v4.0';

      CREATE INDEX IF NOT EXISTS "IDX_cv_embedding_embedding_cosine_hnsw_nomic"
      ON "cv_embedding" USING hnsw ((embedding::vector(768)) vector_cosine_ops)
      WHERE model = 'nomic-embed-text-v2-moe';

    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_cv_embedding_embedding_cosine_hnsw_cohere"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_cv_embedding_embedding_cosine_hnsw_nomic"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cv_embedding_cvId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cv_embedding"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cv"`);
  }
}
