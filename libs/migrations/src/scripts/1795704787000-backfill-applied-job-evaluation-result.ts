import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillAppliedJobEvaluationResult1795704787000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "job_application"
      SET "evaluationResult" = 'apply'
      WHERE "status" = 'applied'
        AND "evaluationResult" IS NULL
    `);
  }

  public down(): Promise<void> {
    // Preserve confirmed verdicts during rollback.
    return Promise.resolve();
  }
}
