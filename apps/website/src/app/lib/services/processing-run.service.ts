import { JobApplicationProcessingRun } from '@apps/shared';
import { EntityManager, In, MoreThan, Repository } from 'typeorm';
import { getDataSource } from '../db/db-source';
import type { ProcessingRunQuota } from '../../types/processing-run-quota';

const RUN_LIMIT_WINDOW_MS = 24 * 60 * 60_000;
const MAX_RUNS_PER_WINDOW = 5;

export class ProcessingRunLimitError extends Error {
  constructor(
    message: string,
    public readonly status: 409 | 429,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

async function fetchProcessingRunQuota(
  repository: Repository<JobApplicationProcessingRun>,
  userId: string,
): Promise<ProcessingRunQuota> {
  const now = Date.now();
  const recentRuns = await repository.find({
    select: { createdAt: true },
    where: {
      userId,
      createdAt: MoreThan(new Date(now - RUN_LIMIT_WINDOW_MS)),
    },
    order: { createdAt: 'DESC' },
    take: MAX_RUNS_PER_WINDOW,
  });
  let nextAvailableAt: string | null = null;
  if (recentRuns.length >= MAX_RUNS_PER_WINDOW) {
    const oldestCountedRun = recentRuns[MAX_RUNS_PER_WINDOW - 1];
    nextAvailableAt = new Date(
      oldestCountedRun.createdAt.getTime() + RUN_LIMIT_WINDOW_MS,
    ).toISOString();
  }

  return {
    limit: MAX_RUNS_PER_WINDOW,
    remaining: MAX_RUNS_PER_WINDOW - recentRuns.length,
    nextAvailableAt,
  };
}

export async function getProcessingRunQuota(
  userId: string,
): Promise<ProcessingRunQuota> {
  const dataSource = await getDataSource();
  return fetchProcessingRunQuota(
    dataSource.getRepository(JobApplicationProcessingRun),
    userId,
  );
}

async function checkProcessingRunLimits(
  repository: Repository<JobApplicationProcessingRun>,
  userId: string,
): Promise<void> {
  if (
    await repository.existsBy({
      userId,
      status: In(['pending', 'in progress']),
    })
  ) {
    throw new ProcessingRunLimitError(
      'A processing run is already active.',
      409,
    );
  }

  const quota = await fetchProcessingRunQuota(repository, userId);
  if (quota.remaining === 0 && quota.nextAvailableAt) {
    const retryAfterMs = Date.parse(quota.nextAvailableAt) - Date.now();
    throw new ProcessingRunLimitError(
      'Processing limit reached. Try again later.',
      429,
      Math.max(1, Math.ceil(retryAfterMs / 1000)),
    );
  }
}

export async function reserveJobApplicationProcessingRun({
  threadId,
  userId,
}: {
  threadId: string;
  userId: string;
}) {
  const dataSource = await getDataSource();

  return dataSource.transaction(
    'READ COMMITTED',
    async (manager: EntityManager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`processing-run:${userId}`],
      );

      const repository = manager.getRepository(JobApplicationProcessingRun);
      await checkProcessingRunLimits(repository, userId);

      return repository.save({
        threadId,
        status: 'pending',
        totalJobs: 0,
        evaluatedJobApplications: 0,
        dismissedJobApplications: 0,
        appliedJobApplications: 0,
        userId,
        createdAt: new Date(),
      });
    },
  );
}
