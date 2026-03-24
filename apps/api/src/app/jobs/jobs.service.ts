import { Injectable } from '@nestjs/common';
import { LinkedinService } from './linkedin/linkedin.service';
import { StartupJobsService } from './startupjobs/startupjobs.service';
import { Job } from './types';
import { InjectRepository } from '@nestjs/typeorm';
import { JobApplication } from '@apps/shared';
import { Repository } from 'typeorm';

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
  ): Promise<Job[]> {
    const [linkedInJobs, startupJobs] = await Promise.all([
      linkedinEnabled ? this.linkedinService.fetchJobs() : Promise.resolve([]),
      startupJobsEnabled
        ? this.startupjobsService.fetchJobs()
        : Promise.resolve([]),
    ]);

    return [...linkedInJobs, ...startupJobs];
  }

  async saveJobApplication(
    job: Job,
    coverLetter: string,
  ): Promise<JobApplication> {
    let jobApplication = new JobApplication();
    jobApplication.job = job;
    jobApplication.coverLetter = coverLetter;
    jobApplication.createdAt = new Date();
    const savedJobApplication =
      await this.jobApplicationRepository.save(jobApplication);
    return savedJobApplication;
  }
}
