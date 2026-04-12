import {
  areMigrationRecordsEqual,
  buildMigrationRecord,
  getExpectedMigrationRecords,
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
