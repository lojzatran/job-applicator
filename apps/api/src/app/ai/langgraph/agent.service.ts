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

@Injectable()
export class AgentService {
  constructor(
    @Inject(JOB_EVALUATOR_LLM) private readonly jobEvaluatorLlm: BaseChatModel,
    @Inject(COVER_LETTER_GENERATOR_LLM)
    private readonly coverLetterGeneratorLlm: BaseChatModel,
    private readonly jobsService: JobsService,
    private readonly pdfService: PdfService,
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
        recursionLimit: jobs.length + 1,
      },
    );
    console.log('Agent Finished: ' + JSON.stringify(result, null, 2));

    await this.jobsService.updateJobApplications(
      result.coverLetters.map((coverLetter) => ({
        url: coverLetter.url,
        coverLetter: coverLetter.coverLetter,
      })),
    );
  }
}
