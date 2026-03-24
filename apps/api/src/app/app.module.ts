import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { LinkedinService } from './jobs/linkedin/linkedin.service';
import { StartupJobsService } from './jobs/startupjobs/startupjobs.service';
import { JobsService } from './jobs/jobs.service';
import { AgentService } from './ai/langgraph/agent.service';
import {
  coverLetterGeneratorLlmProvider,
  jobEvaluatorLlmProvider,
} from './ai/providers/llm.provider';
import { PdfService } from './documents/pdf/pdf.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobApplication } from '@apps/shared';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'job_applicator',
      entities: [JobApplication],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([JobApplication]),
  ],
  controllers: [AppController],
  providers: [
    LinkedinService,
    JobsService,
    StartupJobsService,
    AgentService,
    jobEvaluatorLlmProvider,
    coverLetterGeneratorLlmProvider,
    PdfService,
  ],
})
export class AppModule {}
