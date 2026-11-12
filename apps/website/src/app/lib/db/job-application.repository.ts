import { JobApplication } from '@apps/shared';
import type { Repository } from 'typeorm';
import { getDataSource } from './db-source';

async function getRepository(): Promise<Repository<JobApplication>> {
  const dataSource = await getDataSource();
  return dataSource.getRepository(JobApplication);
}

export async function listJobApplications(
  userId: string,
): Promise<JobApplication[]> {
  const jobApplicationsRepository = await getRepository();
  return jobApplicationsRepository
    .createQueryBuilder('job_application')
    .orderBy('job_application.coverLetter', 'DESC', 'NULLS LAST')
    .addOrderBy('job_application.createdAt', 'DESC')
    .innerJoin('job_application.job', 'job')
    .addSelect('job.id')
    .where('job_application.userId = :userId', { userId })
    .getMany();
}

export async function getJobApplication(
  id: number,
  userId: string,
): Promise<JobApplication | null> {
  const jobApplicationsRepository = await getRepository();
  return jobApplicationsRepository.findOne({
    where: { id, userId },
    relations: { job: true },
  });
}
