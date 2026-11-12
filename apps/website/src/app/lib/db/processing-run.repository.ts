import { JobApplicationProcessingRun } from '@apps/shared';
import { In } from 'typeorm';
import { getAppDataSource } from './db-source';

export async function failPendingJobApplicationProcessingRun(
  threadId: string,
  userId: string,
): Promise<void> {
  const appDataSource = await getAppDataSource();
  await appDataSource
    .getRepository(JobApplicationProcessingRun)
    .update({ threadId, userId, status: 'pending' }, { status: 'failed' });
}

export async function getJobApplicationProcessingRunByThreadIdAndUserId(
  threadId: string,
  userId: string,
): Promise<JobApplicationProcessingRun | null> {
  const appDataSource = await getAppDataSource();

  const jobApplicationProcessingRunRepository = appDataSource.getRepository(
    JobApplicationProcessingRun,
  );

  return jobApplicationProcessingRunRepository.findOneBy({ threadId, userId });
}

export async function getInProgressJobApplicationProcessingRunForUser(
  userId: string,
): Promise<JobApplicationProcessingRun | null> {
  const appDataSource = await getAppDataSource();

  const jobApplicationProcessingRunRepository = appDataSource.getRepository(
    JobApplicationProcessingRun,
  );

  return jobApplicationProcessingRunRepository.findOne({
    where: { userId, status: In(['pending', 'in progress']) },
  });
}
