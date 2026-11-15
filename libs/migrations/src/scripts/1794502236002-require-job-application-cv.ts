import { MigrationInterface, QueryRunner } from 'typeorm';

export class RequireJobApplicationCv1794502236002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_application" ALTER COLUMN "cvId" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_application" ALTER COLUMN "cvId" DROP NOT NULL`,
    );
  }
}
