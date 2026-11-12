import { Job } from '@apps/shared';
import { getDataSource } from './db-source';

export async function listJobs(): Promise<Job[]> {
  const dataSource = await getDataSource();

  const jobRepository = dataSource.getRepository(Job);
  return jobRepository
    .createQueryBuilder('job')
    .orderBy('job.id', 'DESC')
    .getMany();
}
