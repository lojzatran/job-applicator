import { Injectable } from '@nestjs/common';
import { LinkedinService } from './linkedin/linkedin.service';
import { StartupJobsService } from './startupjobs/startupjobs.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, JobApplication } from '@apps/shared';
import { In, Repository } from 'typeorm';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(JobApplication)
    private readonly jobApplicationRepository: Repository<JobApplication>,
    private readonly linkedinService: LinkedinService,
    private readonly startupjobsService: StartupJobsService,
  ) {}

  async fetchJobs(
    linkedinEnabled: boolean,
    startupJobsEnabled: boolean,
  ): Promise<Partial<Job>[]> {
    const [linkedInJobs, startupJobs] = await Promise.all([
      linkedinEnabled ? this.linkedinService.fetchJobs() : Promise.resolve([]),
      startupJobsEnabled
        ? this.startupjobsService.fetchJobs()
        : Promise.resolve([]),
    ]);

    return [...linkedInJobs, ...startupJobs];
  }

  async filterOutJobsWithApplications(
    userId: string,
    jobs: Partial<Job>[],
  ): Promise<Partial<Job>[]> {
    const jobUrls = jobs.map((job) => job.url);
    const jobApplications = await this.jobApplicationRepository.find({
      where: {
        userId: userId,
        job: {
          url: In(jobUrls),
        },
      },
      relations: ['job'],
    });
    return jobs.filter(
      (job) =>
        !jobApplications.some(
          (jobApplication) => jobApplication.job.url === job.url,
        ),
    );
  }

  async updateJobApplications(
    updates: {
      url: string;
      coverLetter: string;
    }[],
  ): Promise<void> {
    if (updates.length === 0) {
      return;
    }

    const tableName = this.jobApplicationRepository.metadata.tableName;
    const valuePlaceholders = updates
      .map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`)
      .join(', ');
    const parameters = updates.flatMap(({ url, coverLetter }) => [
      url,
      coverLetter,
    ]);

    await this.jobApplicationRepository.manager.query(
      `
        UPDATE ${tableName} AS job_application
        SET "coverLetter" = updates.cover_letter
        FROM (VALUES ${valuePlaceholders}) AS updates(url, cover_letter)
        WHERE job_application.url = updates.url
      `,
      parameters,
    );
  }
}
