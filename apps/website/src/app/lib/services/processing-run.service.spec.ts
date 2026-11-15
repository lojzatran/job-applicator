import { In } from 'typeorm';
import { getDataSource } from '../db/db-source';
import { getProcessingRunQuota } from './processing-run.service';

jest.mock('../db/db-source', () => ({ getDataSource: jest.fn() }));

describe('getProcessingRunQuota', () => {
  it('counts active, completed, and failed runs but excludes skipped runs', async () => {
    const now = new Date('2026-11-15T12:00:00Z');
    jest.useFakeTimers().setSystemTime(now);
    const runs = [
      { status: 'skipped', createdAt: new Date('2026-11-15T11:59:00Z') },
      { status: 'pending', createdAt: new Date('2026-11-15T11:50:00Z') },
      { status: 'in progress', createdAt: new Date('2026-11-15T11:40:00Z') },
      { status: 'completed', createdAt: new Date('2026-11-15T11:30:00Z') },
      { status: 'failed', createdAt: new Date('2026-11-15T11:20:00Z') },
    ];
    const find = jest.fn().mockImplementation(({ where, take }) => {
      const statuses: string[] = where.status.value;
      return Promise.resolve(
        runs.filter((run) => statuses.includes(run.status)).slice(0, take),
      );
    });
    jest.mocked(getDataSource).mockResolvedValue({
      getRepository: () => ({ find }),
    } as unknown as Awaited<ReturnType<typeof getDataSource>>);

    try {
      await expect(getProcessingRunQuota('user-1')).resolves.toEqual({
        limit: 5,
        remaining: 1,
        nextAvailableAt: null,
      });
      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            status: In(['pending', 'in progress', 'completed', 'failed']),
          }),
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
