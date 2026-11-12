import { Job } from '@apps/shared';
import type { Repository } from 'typeorm';
import { getDataSource } from './db-source';

async function getRepository(): Promise<Repository<Job>> {
  const dataSource = await getDataSource();
  return dataSource.getRepository(Job);
}

export async function listJobs(): Promise<Job[]> {
  const jobRepository = await getRepository();
  return jobRepository
    .createQueryBuilder('job')
    .orderBy('job.id', 'DESC')
    .getMany();
}
