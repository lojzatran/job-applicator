import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { LinkedinService } from './jobs/linkedin/linkedin.service';
import { StartupJobsService } from './jobs/startupjobs/startupjobs.service';
import { JobsService } from './jobs/jobs.service';
import { AgentService } from './ai/langgraph/agent.service';
import { LanggraphService } from './ai/langgraph/langgraph.service';
import {
  coverLetterGeneratorLlmProvider,
  cvParserLlmProvider,
  jobEvaluatorLlmProvider,
  critiqueLlmProvider,
} from './ai/providers/llm.provider';
import { embeddingModelProvider } from './ai/providers/embedding.provider';
import { PdfService } from './documents/pdf/pdf.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job, JobApplication, dataSourceOptions } from '@apps/shared';
import { CvEmbeddingsService } from './cv/embeddings/cv-summary-embeddings.service';
import { CvEmbeddingsRepository } from './cv/embeddings/cv-embeddings.repository';
import { Cv, JobApplicationProcessingRun } from '@apps/shared';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot(dataSourceOptions),
    TypeOrmModule.forFeature([
      JobApplication,
      Cv,
      Job,
      JobApplicationProcessingRun,
    ]),
  ],
  controllers: [AppController],
  providers: [
    LinkedinService,
    JobsService,
    StartupJobsService,
    AgentService,
    LanggraphService,
    jobEvaluatorLlmProvider,
    coverLetterGeneratorLlmProvider,
    critiqueLlmProvider,
    cvParserLlmProvider,
    embeddingModelProvider,
    PdfService,
    CvEmbeddingsRepository,
    CvEmbeddingsService,
  ],
})
export class AppModule {}
