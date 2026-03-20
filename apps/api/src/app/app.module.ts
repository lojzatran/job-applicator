import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LinkedinService } from './jobs/linkedin/linkedin.service';
import { StartupJobsService } from './jobs/startupjobs/startupjobs.service';
import { JobsService } from './jobs/jobs.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, LinkedinService, JobsService, StartupJobsService],
})
export class AppModule {}
