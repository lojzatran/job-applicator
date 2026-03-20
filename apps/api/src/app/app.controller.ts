import { Controller, Get } from '@nestjs/common';
import { JobsService } from './jobs/jobs.service';

@Controller()
export class AppController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async getData() {
    const jobs = await this.jobsService.fetchJobs();
    return jobs;
  }
}
