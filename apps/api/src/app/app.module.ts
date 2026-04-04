import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { LinkedinService } from './jobs/linkedin/linkedin.service';
import { StartupJobsService } from './jobs/startupjobs/startupjobs.service';
import { JobsService } from './jobs/jobs.service';
import { AgentService } from './ai/langgraph/agent.service';
import {
  coverLetterGeneratorLlmProvider,
  cvParserLlmProvider,
  embeddingModelProvider,
  jobEvaluatorLlmProvider,
  critiqueLlmProvider,
} from './ai/providers/llm.provider';
import { PdfService } from './documents/pdf/pdf.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobApplication, dataSourceOptions } from '@apps/shared';
import { CvEmbeddingsService } from './cv/embeddings/cv-summary-embeddings.service';
import { Cv } from '@apps/shared';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot(dataSourceOptions),
    TypeOrmModule.forFeature([JobApplication, Cv]),
  ],
  controllers: [AppController],
  providers: [
    LinkedinService,
    JobsService,
    StartupJobsService,
    AgentService,
    jobEvaluatorLlmProvider,
    coverLetterGeneratorLlmProvider,
    critiqueLlmProvider,
    cvParserLlmProvider,
    embeddingModelProvider,
    PdfService,
    CvEmbeddingsService,
  ],
})
export class AppModule {}
