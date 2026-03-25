import { AppDataSource } from './db-source';
import { JobApplication } from '@apps/shared';

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
