import { JobApplicationProcessingRun } from '@apps/shared';
import { In } from 'typeorm';
import { getDataSource } from './db-source';

export async function failPendingJobApplicationProcessingRun(
  threadId: string,
  userId: string,
): Promise<void> {
  const dataSource = await getDataSource();
  await dataSource
    .getRepository(JobApplicationProcessingRun)
    .update({ threadId, userId, status: 'pending' }, { status: 'failed' });
}

export async function getJobApplicationProcessingRunByThreadIdAndUserId(
  threadId: string,
  userId: string,
): Promise<JobApplicationProcessingRun | null> {
  const dataSource = await getDataSource();

  const jobApplicationProcessingRunRepository = dataSource.getRepository(
    JobApplicationProcessingRun,
  );

  return jobApplicationProcessingRunRepository.findOneBy({ threadId, userId });
}

export async function getInProgressJobApplicationProcessingRunForUser(
  userId: string,
): Promise<JobApplicationProcessingRun | null> {
  const dataSource = await getDataSource();

  const jobApplicationProcessingRunRepository = dataSource.getRepository(
    JobApplicationProcessingRun,
  );

  return jobApplicationProcessingRunRepository.findOne({
    where: { userId, status: In(['pending', 'in progress']) },
  });
}
