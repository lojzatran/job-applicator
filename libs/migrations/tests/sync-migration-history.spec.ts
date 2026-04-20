import {
  areMigrationRecordsEqual,
  buildMigrationRecord,
  getExpectedMigrationFileNames,
  getExpectedMigrationRecords,
  loadMigrationClasses,
  type MigrationRecord,
} from '../src/sync-migration-history.lib';

describe('sync-migration-history', () => {
  it('builds the migration class name from the file name', () => {
    expect(
      buildMigrationRecord('1774427783302-create-job-application.ts'),
    ).toEqual({
      timestamp: '1774427783302',
      name: 'CreateJobApplication1774427783302',
    });
  });

  it('returns migration records sorted by timestamp', () => {
    const files = [
      '1775979793345-create-job-application-processing-run.ts',
      '1774427783302-create-job-application.ts',
      'ignore-me.txt',
      '1774681794561-add-unique-index-to-cv-hash.js',
    ];

    expect(getExpectedMigrationRecords('/tmp/migrations', () => files)).toEqual(
      [
        {
          timestamp: '1774427783302',
          name: 'CreateJobApplication1774427783302',
        },
        {
          timestamp: '1774681794561',
          name: 'AddUniqueIndexToCvHash1774681794561',
        },
        {
          timestamp: '1775979793345',
          name: 'CreateJobApplicationProcessingRun1775979793345',
        },
      ],
    );
  });

  it('returns migration file names sorted by timestamp', () => {
    const files = [
      '1775979793345-create-job-application-processing-run.ts',
      '1774427783302-create-job-application.ts',
      'ignore-me.txt',
      '1774681794561-add-unique-index-to-cv-hash.js',
    ];

    expect(
      getExpectedMigrationFileNames('/tmp/migrations', () => files),
    ).toEqual([
      '1774427783302-create-job-application.ts',
      '1774681794561-add-unique-index-to-cv-hash.js',
      '1775979793345-create-job-application-processing-run.ts',
    ]);
  });

  it('loads migration classes by export name and preserves ordering', async () => {
    const files = [
      '1775979793346-add-unique-thread-id-to-job-application-processing-run.ts',
      '1774427783303-update-job-application.ts',
      '1774427783302-create-job-application.ts',
    ];

    const importer = async (path: string) => {
      if (path.endsWith('1774427783302-create-job-application.ts')) {
        return {
          CreateJobApplication1774427783302: class CreateJobApplication1774427783302 {},
        };
      }

      if (path.endsWith('1774427783303-update-job-application.ts')) {
        return {
          UpdateJobApplication1774427783303: class UpdateJobApplication1774427783303 {},
        };
      }

      return {
        AddUniqueThreadIdToJobApplicationProcessingRun1775979793346: class AddUniqueThreadIdToJobApplicationProcessingRun1775979793346 {},
      };
    };

    const migrationClasses = await loadMigrationClasses(
      '/tmp/migrations',
      () => files,
      importer,
    );

    expect(migrationClasses.map((migrationClass) => migrationClass.name)).toEqual(
      [
        'CreateJobApplication1774427783302',
        'UpdateJobApplication1774427783303',
        'AddUniqueThreadIdToJobApplicationProcessingRun1775979793346',
      ],
    );
  });

  it('detects matching migration histories', () => {
    const expected: MigrationRecord[] = [
      {
        timestamp: '1774427783302',
        name: 'CreateJobApplication1774427783302',
      },
      {
        timestamp: '1774427783303',
        name: 'UpdateJobApplication1774427783303',
      },
    ];

    expect(areMigrationRecordsEqual(expected, [...expected])).toBe(true);
    expect(
      areMigrationRecordsEqual(expected, [
        {
          timestamp: '1774427783302',
          name: 'CreateJobApplication1774427783302',
        },
        { timestamp: '1774427783303', name: 'DifferentName1774427783303' },
      ]),
    ).toBe(false);
    expect(
      areMigrationRecordsEqual(expected, [
        {
          timestamp: '1774427783302',
          name: 'CreateJobApplication1774427783302',
        },
      ]),
    ).toBe(false);
  });
});
