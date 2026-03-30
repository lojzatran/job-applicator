import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHashToCv1774681794560 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv"
      ADD COLUMN IF NOT EXISTS "hash" varchar
    `);

    await queryRunner.query(`
      UPDATE "cv"
      SET "hash" = md5("rawText")
      WHERE "hash" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "cv"
      ALTER COLUMN "hash" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv"
      DROP COLUMN IF EXISTS "hash"
    `);
  }
}
