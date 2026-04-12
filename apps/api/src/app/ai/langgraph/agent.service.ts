import { Injectable } from '@nestjs/common';
import { LanggraphService } from './langgraph.service';
import { JobsService } from '../../jobs/jobs.service';
import { PdfService } from '../../documents/pdf/pdf.service';
import { createLogger, JobApplicationProcessingRun } from '@apps/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface CoverLetterData {
  url: string;
  coverLetter: string;
}

export interface StreamChunk {
  job_evaluator?: {
    isValidJob?: boolean;
    evaluatedJobsCount?: number;
    dismissedJobsCount?: number;
  };
  cover_letter_generator?: {
    appliedJobsCount?: number;
    coverLetters?: CoverLetterData | CoverLetterData[];
  };
}

@Injectable()
export class AgentService {
  private readonly logger = createLogger(AgentService.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly pdfService: PdfService,
    private readonly langgraphService: LanggraphService,
    @InjectRepository(JobApplicationProcessingRun)
    private readonly jobApplicationProcessingRunRepository: Repository<JobApplicationProcessingRun>,
  ) {}

  private async initializeProcessingRun(threadId: string, totalJobs: number) {
    const baseJobApplicationProcessingRun = {
      status: 'processing',
      totalJobs,
      evaluatedJobApplications: 0,
      dismissedJobApplications: 0,
      appliedJobApplications: 0,
    } as JobApplicationProcessingRun;

    const existingRun =
      await this.jobApplicationProcessingRunRepository.findOneBy({
        threadId,
      });

    if (existingRun) {
      await this.jobApplicationProcessingRunRepository.update(
        { threadId },
        baseJobApplicationProcessingRun,
      );
      return;
    }

    await this.jobApplicationProcessingRunRepository.save(
      this.jobApplicationProcessingRunRepository.create({
        ...baseJobApplicationProcessingRun,
        threadId,
        createdAt: new Date(),
      }),
    );
  }

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

    await this.initializeProcessingRun(options.threadId, jobs.length);

    try {
      const agent = this.langgraphService.build();
      const result: AsyncGenerator<StreamChunk, void, unknown> =
        await agent.stream(
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
            streamMode: 'updates',
          },
        );
      for await (const chunk of result) {
        if (chunk.job_evaluator?.evaluatedJobsCount !== undefined) {
          this.logger.debug(
            'Evaluated Jobs Count: ' + chunk.job_evaluator.evaluatedJobsCount,
          );
          await this.jobApplicationProcessingRunRepository.update(
            { threadId: options.threadId },
            {
              evaluatedJobApplications: chunk.job_evaluator.evaluatedJobsCount,
            },
          );
        }

        if (chunk.job_evaluator?.dismissedJobsCount !== undefined) {
          this.logger.debug(
            'Dismissed Jobs Count: ' + chunk.job_evaluator.dismissedJobsCount,
          );
          await this.jobApplicationProcessingRunRepository.update(
            { threadId: options.threadId },
            {
              dismissedJobApplications: chunk.job_evaluator.dismissedJobsCount,
            },
          );
        }

        if (chunk.cover_letter_generator?.appliedJobsCount !== undefined) {
          this.logger.debug(
            'Applied Jobs Count: ' +
              chunk.cover_letter_generator.appliedJobsCount,
          );
          await this.jobApplicationProcessingRunRepository.update(
            { threadId: options.threadId },
            {
              appliedJobApplications:
                chunk.cover_letter_generator.appliedJobsCount,
            },
          );
        }

        if (chunk.cover_letter_generator?.coverLetters) {
          this.logger.debug(
            'Cover Letters: ' +
              JSON.stringify(chunk.cover_letter_generator.coverLetters),
          );
          const rawCoverLetters = chunk.cover_letter_generator.coverLetters;
          const coverLetters = Array.isArray(rawCoverLetters)
            ? rawCoverLetters
            : [rawCoverLetters];

          await this.jobsService.updateJobApplications(
            coverLetters.map((coverLetter) => ({
              url: coverLetter.url,
              coverLetter: coverLetter.coverLetter,
            })),
          );
        }
      }

      this.logger.info('Agent Finished');

      await this.jobApplicationProcessingRunRepository.update(
        { threadId: options.threadId },
        {
          status: 'completed',
        },
      );
    } catch (error) {
      await this.jobApplicationProcessingRunRepository.update(
        { threadId: options.threadId },
        {
          status: 'failed',
        },
      );
      throw error;
    }
  }
}
