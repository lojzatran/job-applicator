import { Injectable } from '@nestjs/common';
import { LanggraphService } from './langgraph.service';
import { JobsService } from '../../jobs/jobs.service';
import { PdfService } from '../../documents/pdf/pdf.service';
import {
  createLogger,
  Job,
  JobApplication,
  JobApplicationProcessingRun,
} from '@apps/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface CoverLetterData {
  url: string;
  coverLetter: string;
}

export interface StreamChunk {
  cv_summarizer?: {
    cvEntityId: number;
  };
  job_supplier?: {
    job: Job;
  };
  job_evaluator?: {
    isValidJob?: boolean;
    url: string;
    evaluatedJobsCount?: number;
    dismissedJobsCount?: number;
  };
  cover_letter_generator?: {
    appliedJobsCount?: number;
    coverLetters?: CoverLetterData | CoverLetterData[];
    url: string;
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
    @InjectRepository(JobApplication)
    private readonly jobApplicationRepository: Repository<JobApplication>,
  ) {}

  private async initializeProcessingRun(threadId: string, totalJobs: number) {
    const baseJobApplicationProcessingRun = {
      status: 'in progress',
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
    userId: string,
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

    const jobsToProcess = await this.jobsService.filterOutJobsWithApplications(
      userId,
      jobs,
    );

    await this.initializeProcessingRun(options.threadId, jobsToProcess.length);

    try {
      const agent = await this.langgraphService.build();
      const result: AsyncGenerator<StreamChunk, void, unknown> =
        await agent.stream(
          {
            cvText: cvText,
            maxAppliedJobs: options.maxJobs,
            jobs: jobsToProcess,
            userId: userId,
          },
          {
            configurable: { thread_id: options.threadId },
            // recursion is a super-step, and in my graph there are currently 4 super-steps for each job.
            // I also add a buffer of 5 (random number) just be sure.
            recursionLimit: 4 * jobsToProcess.length + 5,
            streamMode: 'updates',
          },
        );

      for await (const chunk of result) {
        await this.processChunk(chunk, { ...options, userId });
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

  private async processChunk(
    chunk: StreamChunk,
    options: {
      maxJobs: number;
      linkedinEnabled: boolean;
      startupJobsEnabled: boolean;
      threadId: string;
      userId: string;
    },
  ) {
    let cvEntityId: number | null = null;
    if (chunk.cv_summarizer?.cvEntityId) {
      cvEntityId = chunk.cv_summarizer.cvEntityId;
    } else if (chunk.job_supplier?.job) {
      this.logger.debug(
        'Create new job application for job: ' +
          JSON.stringify(chunk.job_supplier.job.url),
      );
      await this.jobApplicationRepository.save({
        userId: options.userId,
        cv: cvEntityId ? { id: cvEntityId } : undefined,
        job: chunk.job_supplier.job,
        status: 'processing',
      });
    } else if (chunk.job_evaluator !== undefined) {
      await this.processJobEvaluatorChunk(chunk, options);
    } else if (chunk.cover_letter_generator !== undefined) {
      await this.processCoverLetterGeneratorChunk(chunk, options);
    }
    return cvEntityId;
  }

  private async processCoverLetterGeneratorChunk(
    chunk: StreamChunk,
    options: {
      maxJobs: number;
      linkedinEnabled: boolean;
      startupJobsEnabled: boolean;
      threadId: string;
    },
  ) {
    this.logger.debug(
      'Applied Jobs Count: ' + chunk.cover_letter_generator!.appliedJobsCount,
    );
    this.logger.debug(
      'Cover Letters: ' +
        JSON.stringify(chunk.cover_letter_generator!.coverLetters),
    );
    const rawCoverLetters = chunk.cover_letter_generator!.coverLetters;
    const coverLetters = Array.isArray(rawCoverLetters)
      ? rawCoverLetters
      : [rawCoverLetters];
    const applicationToApply = await this.jobApplicationRepository.findOne({
      where: { job: { url: chunk.cover_letter_generator!.url } },
    });
    if (applicationToApply) {
      await this.jobApplicationRepository.update(applicationToApply.id, {
        status: 'applied',
        coverLetter: coverLetters[0]?.coverLetter,
      });
    }
    await this.jobApplicationProcessingRunRepository.update(
      { threadId: options.threadId },
      {
        appliedJobApplications: chunk.cover_letter_generator!.appliedJobsCount,
      },
    );
  }

  private async processJobEvaluatorChunk(
    chunk: StreamChunk,
    options: {
      maxJobs: number;
      linkedinEnabled: boolean;
      startupJobsEnabled: boolean;
      threadId: string;
    },
  ) {
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
      const applicationToDismiss = await this.jobApplicationRepository.findOne({
        where: { job: { url: chunk.job_evaluator.url } },
      });
      if (applicationToDismiss) {
        await this.jobApplicationRepository.update(applicationToDismiss.id, {
          status: 'dismissed',
        });
      }
      await this.jobApplicationProcessingRunRepository.update(
        { threadId: options.threadId },
        {
          dismissedJobApplications: chunk.job_evaluator.dismissedJobsCount,
        },
      );
    }
  }
}
