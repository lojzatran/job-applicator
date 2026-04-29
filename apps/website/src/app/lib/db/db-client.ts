import { AppDataSource } from './db-source';
import { JobApplication, JobApplicationProcessingRun, Job } from '@apps/shared';

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

export async function listJobApplications(
  userId: string,
): Promise<JobApplication[]> {
  const appDataSource = await getAppDataSource();

  const jobApplicationsRepository = appDataSource.getRepository(JobApplication);
  return jobApplicationsRepository
    .createQueryBuilder('job_application')
    .orderBy('job_application.coverLetter', 'DESC', 'NULLS LAST')
    .addOrderBy('job_application.createdAt', 'DESC')
    .innerJoin('job_application.job', 'job')
    .addSelect('job.id')
    .where('job_application.userId = :userId', { userId })
    .getMany();
}

export async function listJobs(): Promise<Job[]> {
  const appDataSource = await getAppDataSource();

  const jobRepository = appDataSource.getRepository(Job);
  return jobRepository
    .createQueryBuilder('job')
    .orderBy('job.id', 'DESC')
    .getMany();
}

export async function getJobApplication(
  id: number,
): Promise<JobApplication | null> {
  const appDataSource = await getAppDataSource();

  const jobApplicationsRepository = appDataSource.getRepository(JobApplication);
  return jobApplicationsRepository.findOne({
    where: { id },
    relations: { job: true },
  });
}

export async function saveJobApplicationProcessingRun({
  threadId,
  userId,
}: {
  threadId: string;
  userId: string;
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
    userId,
    createdAt: new Date(),
  });
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
    where: { userId, status: 'in progress' },
  });
}
