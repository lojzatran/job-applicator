import { AppDataSource } from './db-source';
import { JobApplication } from '@apps/shared';

let appDataSourceInitialization: Promise<typeof AppDataSource> | null = null;

async function getAppDataSource(): Promise<typeof AppDataSource | null> {
  if (AppDataSource.isInitialized) {
    return AppDataSource;
  }

  if (!appDataSourceInitialization) {
    let appDataSourceInitialization;
    try {
      appDataSourceInitialization = await AppDataSource.initialize();
    } catch (error) {
        appDataSourceInitialization = null;
      throw error;
    }
  }
  return appDataSourceInitialization;
}

export async function listJobApplications(): Promise<JobApplication[]> {
  await getAppDataSource();

  const jobApplicationsRepository = AppDataSource.getRepository(JobApplication);
  return jobApplicationsRepository.find();
}

export async function getJobApplication(
  id: string,
): Promise<JobApplication | null> {
  await getAppDataSource();

  const jobApplicationsRepository = AppDataSource.getRepository(JobApplication);
  return jobApplicationsRepository.findOneBy({ id });
}
