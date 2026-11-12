import { Job } from '@apps/shared';
import { getAppDataSource } from './db-source';

export async function listJobs(): Promise<Job[]> {
  const appDataSource = await getAppDataSource();

  const jobRepository = appDataSource.getRepository(Job);
  return jobRepository
    .createQueryBuilder('job')
    .orderBy('job.id', 'DESC')
    .getMany();
}
