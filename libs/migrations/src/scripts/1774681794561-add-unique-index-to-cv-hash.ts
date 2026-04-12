import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueIndexToCvHash1774681794561 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv"
      ADD CONSTRAINT "UQ_cv_hash" UNIQUE ("hash")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv"
      DROP CONSTRAINT IF EXISTS "UQ_cv_hash"
    `);
  }
}
