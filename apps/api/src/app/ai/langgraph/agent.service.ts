import { Injectable } from '@nestjs/common';
import { LanggraphService } from './langgraph.service';
import { JobsService } from '../../jobs/jobs.service';
import { PdfService } from '../../documents/pdf/pdf.service';
import { createLogger } from '@apps/shared';

@Injectable()
export class AgentService {
  private readonly logger = createLogger('agent-service');

  constructor(
    private readonly jobsService: JobsService,
    private readonly pdfService: PdfService,
    private readonly langgraphService: LanggraphService,
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

    const agent = this.langgraphService.build();
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
    this.logger.info(result, 'Agent Finished');

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
