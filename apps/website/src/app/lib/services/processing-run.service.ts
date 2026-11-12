import { JobApplicationProcessingRun } from '@apps/shared';
import { In, MoreThan, Repository } from 'typeorm';
import { getAppDataSource } from '../db/db-source';

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

  const now = Date.now();
  const recentRuns = await repository.find({
    where: {
      userId,
      createdAt: MoreThan(new Date(now - RUN_LIMIT_WINDOW_MS)),
    },
    order: { createdAt: 'DESC' },
    take: MAX_RUNS_PER_WINDOW,
  });
  if (recentRuns.length >= MAX_RUNS_PER_WINDOW) {
    const oldestCountedRun = recentRuns[MAX_RUNS_PER_WINDOW - 1];
    const retryAfterMs =
      oldestCountedRun.createdAt.getTime() + RUN_LIMIT_WINDOW_MS - now;
    throw new ProcessingRunLimitError(
      'Processing limit reached. Try again later.',
      429,
      Math.ceil(retryAfterMs / 1000),
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
  const appDataSource = await getAppDataSource();

  return appDataSource.transaction('READ COMMITTED', async (manager) => {
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
  });
}
