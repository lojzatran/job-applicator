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
}
