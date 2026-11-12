import { JobApplicationProcessingRun } from '@apps/shared';
import { In, LessThan, type Repository } from 'typeorm';
import { getDataSource } from './db-source';
import { PROCESSING_RUN_STALE_AFTER_MS } from '../../utils/processing-run';

async function getRepository(): Promise<
  Repository<JobApplicationProcessingRun>
> {
  const dataSource = await getDataSource();
  return dataSource.getRepository(JobApplicationProcessingRun);
}

export async function cancelStaleJobApplicationProcessingRun(
  threadId: string,
  userId: string,
): Promise<JobApplicationProcessingRun | null> {
  const repository = await getRepository();
  const result = await repository.update(
    {
      threadId,
      userId,
      status: In(['pending', 'in progress']),
      lastUpdatedAt: LessThan(
        new Date(Date.now() - PROCESSING_RUN_STALE_AFTER_MS),
      ),
    },
    { status: 'failed' },
  );

  if (!result.affected) return null;

  return repository.findOneBy({ threadId, userId });
}

export async function failPendingJobApplicationProcessingRun(
  threadId: string,
  userId: string,
): Promise<void> {
  const repository = await getRepository();
  await repository.update(
    { threadId, userId, status: 'pending' },
    { status: 'failed' },
  );
}

export async function getJobApplicationProcessingRunByThreadIdAndUserId(
  threadId: string,
  userId: string,
): Promise<JobApplicationProcessingRun | null> {
  const jobApplicationProcessingRunRepository = await getRepository();

  return jobApplicationProcessingRunRepository.findOneBy({ threadId, userId });
}

export async function getInProgressJobApplicationProcessingRunForUser(
  userId: string,
): Promise<JobApplicationProcessingRun | null> {
  const jobApplicationProcessingRunRepository = await getRepository();

  return jobApplicationProcessingRunRepository.findOne({
    where: { userId, status: In(['pending', 'in progress']) },
  });
}
