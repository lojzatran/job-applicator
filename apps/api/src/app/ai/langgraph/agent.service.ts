import { Inject, Injectable } from '@nestjs/common';
import { AgentBuilder } from './AgentBuilder';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  COVER_LETTER_GENERATOR_LLM,
  JOB_EVALUATOR_LLM,
  CRITIQUE_LLM,
} from '../ai.constants';
import { JobsService } from '../../jobs/jobs.service';
import { PdfService } from '../../documents/pdf/pdf.service';
import { CvEmbeddingsService } from '../../cv/embeddings/cv-summary-embeddings.service';
import { Repository } from 'typeorm';
import { Cv } from '@apps/shared';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AgentService {
  constructor(
    @Inject(JOB_EVALUATOR_LLM) private readonly jobEvaluatorLlm: BaseChatModel,
    @Inject(COVER_LETTER_GENERATOR_LLM)
    private readonly coverLetterGeneratorLlm: BaseChatModel,
    private readonly jobsService: JobsService,
    private readonly pdfService: PdfService,
    private readonly cvEmbeddingsService: CvEmbeddingsService,
    @InjectRepository(Cv)
    private readonly cvRepository: Repository<Cv>,
    @Inject(CRITIQUE_LLM)
    private readonly critiqueLlm: BaseChatModel,
  ) {}

  async executeAgent(
    filePath: string,
    options: {
      maxJobs: number;
      linkedinEnabled: boolean;
      startupJobsEnabled: boolean;
      threadId: string;
    },
  ) {
    const [cvText, jobs] = await Promise.all([
      this.pdfService.extractTextContent(filePath),
      this.jobsService.fetchJobs(
        options.linkedinEnabled,
        options.startupJobsEnabled,
      ),
    ]);

    const agentBuilder = new AgentBuilder(
      this.jobEvaluatorLlm,
      this.coverLetterGeneratorLlm,
      this.critiqueLlm,
      this.cvEmbeddingsService,
      this.cvRepository,
    );
    const agent = agentBuilder.build();
    const result = await agent.invoke(
      {
        cvText: cvText,
        maxAppliedJobs: options.maxJobs,
        jobs: jobs,
      },
      {
        configurable: { thread_id: options.threadId },
        // recursion is a super-step, and in my graph there are currently 4 super-steps for each job.
        // I also add a buffer of 5 (random number) just be sure.
        recursionLimit: 4 * jobs.length + 5,
      },
    );
    console.log('Agent Finished: ' + JSON.stringify(result, null, 2));

    await this.jobsService.updateJobApplications(
      result.coverLetters.map(
        (coverLetter: { url: string; coverLetter: string }) => ({
          url: coverLetter.url,
          coverLetter: coverLetter.coverLetter,
        }),
      ),
    );
  }
}
