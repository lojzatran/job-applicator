import { MigrationInterface, QueryRunner } from 'typeorm';

interface DuplicateThreadIdRow {
  threadId: string;
  count: string | number;
}

export class AddUniqueThreadIdToJobApplicationProcessingRun1775979793346
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicateThreadIds = (await queryRunner.query(`
      SELECT
        "threadId",
        COUNT(*)::int AS "count"
      FROM "job_application_processing_run"
      GROUP BY "threadId"
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC, "threadId" ASC
    `)) as DuplicateThreadIdRow[];

    if (duplicateThreadIds.length > 0) {
      throw new Error(this.buildDuplicateThreadIdError(duplicateThreadIds));
    }

    await queryRunner.query(`
      ALTER TABLE "job_application_processing_run"
      ADD CONSTRAINT "UQ_job_application_processing_run_threadId" UNIQUE ("threadId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_application_processing_run"
      DROP CONSTRAINT IF EXISTS "UQ_job_application_processing_run_threadId"
    `);
  }

  private buildDuplicateThreadIdError(
    duplicateThreadIds: DuplicateThreadIdRow[],
  ): string {
    const duplicateDetails = duplicateThreadIds
      .map(
        (row) =>
          `threadId=${JSON.stringify(row.threadId)}, count=${Number(row.count)}`,
      )
      .join('\n');

    return [
      'Cannot add a unique constraint on "job_application_processing_run"."threadId" because duplicate values already exist.',
      'Resolve the duplicate rows manually, then rerun the migration.',
      duplicateDetails,
    ].join('\n');
  }
}
