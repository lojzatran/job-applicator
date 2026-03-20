import { Injectable } from '@nestjs/common';
import { LinkedinService } from './linkedin/linkedin.service';
import { StartupJobsService } from './startupjobs/startupjobs.service';
import { Job } from './types';

@Injectable()
export class JobsService {
  constructor(
    private readonly linkedinService: LinkedinService,
    private readonly startupjobsService: StartupJobsService,
  ) {}

  async fetchJobs(): Promise<Job[]> {
    const [linkedInJobs, startupJobs] = await Promise.all([
      this.linkedinService.fetchJobs(),
      this.startupjobsService.fetchJobs(),
    ]);

    return [...linkedInJobs, ...startupJobs];
  }
}
