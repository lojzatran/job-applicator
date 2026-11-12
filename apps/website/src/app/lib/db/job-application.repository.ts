import { JobApplication } from '@apps/shared';
import { getDataSource } from './db-source';

export async function listJobApplications(
  userId: string,
): Promise<JobApplication[]> {
  const dataSource = await getDataSource();

  const jobApplicationsRepository = dataSource.getRepository(JobApplication);
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
  const dataSource = await getDataSource();

  const jobApplicationsRepository = dataSource.getRepository(JobApplication);
  return jobApplicationsRepository.findOne({
    where: { id, userId },
    relations: { job: true },
  });
}
