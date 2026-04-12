import { AppDataSource } from './db-source';
import { JobApplication, JobApplicationProcessingRun } from '@apps/shared';

let appDataSourceInitialization: Promise<typeof AppDataSource> | null = null;

async function getAppDataSource(): Promise<typeof AppDataSource> {
  if (AppDataSource.isInitialized) {
    return AppDataSource;
  }

  if (!appDataSourceInitialization) {
    appDataSourceInitialization = AppDataSource.initialize();
  }

  try {
    return await appDataSourceInitialization;
  } catch (error) {
    appDataSourceInitialization = null;
    throw error;
  }
}

export async function listJobApplications(): Promise<JobApplication[]> {
  const appDataSource = await getAppDataSource();

  const jobApplicationsRepository = appDataSource.getRepository(JobApplication);
  return jobApplicationsRepository
    .createQueryBuilder('job_application')
    .orderBy('job_application.coverLetter', 'DESC', 'NULLS LAST')
    .addOrderBy('job_application.createdAt', 'DESC')
    .getMany();
}

export async function getJobApplication(
  id: string,
): Promise<JobApplication | null> {
  const appDataSource = await getAppDataSource();

  const jobApplicationsRepository = appDataSource.getRepository(JobApplication);
  return jobApplicationsRepository.findOneBy({ id });
}

export async function saveJobApplicationProcessingRun({
  threadId,
}: {
  threadId: string;
}) {
  const appDataSource = await getAppDataSource();

  const jobApplicationProcessingRunRepository = appDataSource.getRepository(
    JobApplicationProcessingRun,
  );

  return jobApplicationProcessingRunRepository.save({
    threadId,
    status: 'pending',
    totalJobs: 0,
    evaluatedJobApplications: 0,
    dismissedJobApplications: 0,
    appliedJobApplications: 0,
    createdAt: new Date(),
  });
}

export async function getJobApplicationProcessingRun(
  threadId: string,
): Promise<JobApplicationProcessingRun | null> {
  const appDataSource = await getAppDataSource();

  const jobApplicationProcessingRunRepository = appDataSource.getRepository(
    JobApplicationProcessingRun,
  );

  return jobApplicationProcessingRunRepository.findOneBy({ threadId });
}
