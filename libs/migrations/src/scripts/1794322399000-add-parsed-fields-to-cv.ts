import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParsedFieldsToCv1794322399000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv"
      ADD COLUMN "summary" text,
      ADD COLUMN "skills" text[],
      ADD COLUMN "experience" text[],
      ADD COLUMN "projects" text[],
      ADD COLUMN "education" text[],
      ADD COLUMN "other" text[]
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv"
      DROP COLUMN "summary",
      DROP COLUMN "skills",
      DROP COLUMN "experience",
      DROP COLUMN "projects",
      DROP COLUMN "education",
      DROP COLUMN "other"
    `);
  }
}
