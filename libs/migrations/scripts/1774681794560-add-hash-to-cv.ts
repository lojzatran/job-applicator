import { MigrationInterface, QueryRunner } from 'typeorm';

interface DuplicateCvHashRow {
  hash: string;
  rawText: string;
  count: string | number;
}

export class AddHashToCv1774681794560 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv"
      ADD COLUMN IF NOT EXISTS "hash" varchar
    `);

    const duplicateHashes = (await queryRunner.query(`
      WITH duplicate_hashes AS (
        SELECT
          md5("rawText") AS "hash",
          COUNT(*)::int AS "count"
        FROM "cv"
        GROUP BY md5("rawText")
        HAVING COUNT(*) > 1
      )
      SELECT
        duplicate_hashes."hash",
        duplicate_hashes."count",
        (
          SELECT "rawText"
          FROM "cv"
          WHERE md5("rawText") = duplicate_hashes."hash"
          ORDER BY "id" ASC
          LIMIT 1
        ) AS "rawText"
      FROM duplicate_hashes
      ORDER BY duplicate_hashes."count" DESC, duplicate_hashes."hash" ASC
    `)) as DuplicateCvHashRow[];

    if (duplicateHashes.length > 0) {
      throw new Error(this.buildDuplicateHashError(duplicateHashes));
    }

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

  private buildDuplicateHashError(
    duplicateHashes: DuplicateCvHashRow[],
  ): string {
    const duplicateDetails = duplicateHashes
      .map((row) => {
        const count = Number(row.count);
        const rawTextPreview =
          row.rawText.length > 120
            ? `${row.rawText.slice(0, 120)}...`
            : row.rawText;

        return `hash=${row.hash}, count=${count}, rawText=${JSON.stringify(rawTextPreview)}`;
      })
      .join('\n');

    return [
      'Cannot backfill "cv"."hash" because duplicate md5("rawText") values already exist in table "cv".',
      'Resolve the duplicate "rawText" rows manually, then rerun the migration before adding the unique constraint on "hash".',
      duplicateDetails,
    ].join('\n');
  }
}
