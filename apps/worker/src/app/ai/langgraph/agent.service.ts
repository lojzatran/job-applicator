import { Injectable } from '@nestjs/common';
import { LanggraphService } from './langgraph.service';
import { JobsService } from '../../jobs/jobs.service';
import { PdfService } from '../../documents/pdf/pdf.service';
import {
  createLogger,
  Cv,
  Job,
  JobApplication,
  JobApplicationProcessingRun,
  JobEvaluationDecision,
  type JobEvaluationReason,
} from '@apps/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'node:crypto';

export interface CoverLetterData {
  url: string;
  coverLetter: string;
}

export interface StreamChunk {
  job_supplier?: {
    job: Job;
    cvEntityId: number;
  };
  job_evaluator?: {
    cvEntityId: number;
    isValidJob?: boolean;
    evaluationResult?: JobEvaluationDecision;
    evaluationReason?: JobEvaluationReason;
    url: string;
    evaluatedJobsCount?: number;
    uncertainJobsCount?: number;
    dismissedJobsCount?: number;
  };
  cover_letter_generator?: {
    cvEntityId: number;
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
    @InjectRepository(Cv)
    private readonly cvRepository: Repository<Cv>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
  ) {}

  private async initializeProcessingRun(
    userId: string,
    threadId: string,
    totalJobs: number,
  ) {
    const baseJobApplicationProcessingRun = {
      userId,
      status: 'in progress',
      totalJobs,
      evaluatedJobApplications: 0,
      dismissedJobApplications: 0,
      uncertainJobApplications: 0,
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
    try {
      const cvText = await this.pdfService.extractTextContent(filePath);
      const hash = createHash('md5').update(cvText).digest('hex');
      const existingCv = await this.cvRepository.findOneBy({ hash });
      let maxAppliedJobs = options.maxJobs;
      let jobsToProcess = await this.jobsService.fetchJobs(
        options.linkedinEnabled,
        options.startupJobsEnabled,
      );
      if (existingCv) {
        const appliedJobsCount = await this.jobApplicationRepository.countBy({
          userId,
          cv: { id: existingCv.id },
          evaluationResult: JobEvaluationDecision.APPLY,
          status: 'applied',
        });
        maxAppliedJobs -= appliedJobsCount;
        if (maxAppliedJobs <= 0) {
          await this.jobApplicationProcessingRunRepository.update(
            { threadId: options.threadId },
            { status: 'skipped' },
          );
          return;
        }
        jobsToProcess = await this.jobsService.filterOutProcessedJobs(
          userId,
          existingCv.id,
          jobsToProcess,
        );
        if (jobsToProcess.length === 0) {
          await this.jobApplicationProcessingRunRepository.update(
            { threadId: options.threadId },
            { status: 'skipped' },
          );
          return;
        }
      }

      await this.initializeProcessingRun(
        userId,
        options.threadId,
        jobsToProcess.length,
      );

      const agent = await this.langgraphService.build();
      const result: AsyncGenerator<StreamChunk, void, unknown> =
        await agent.stream(
          {
            cvText: cvText,
            maxAppliedJobs,
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
        await this.processorChunk(chunk, { ...options, userId });
      }

      this.logger.info('Agent Finished');

      await this.jobApplicationProcessingRunRepository.update(
        { threadId: options.threadId },
        {
          status: 'completed',
        },
      );
    } catch (error) {
      try {
        await this.jobApplicationProcessingRunRepository.update(
          { threadId: options.threadId },
          {
            status: 'failed',
          },
        );
      } catch (statusError) {
        this.logger.error(
          { err: statusError, threadId: options.threadId },
          'Failed to mark processing run as failed',
        );
      }
      throw error;
    }
  }

  private async processorChunk(
    chunk: StreamChunk,
    options: {
      maxJobs: number;
      linkedinEnabled: boolean;
      startupJobsEnabled: boolean;
      threadId: string;
      userId: string;
    },
  ) {
    if (chunk.job_supplier?.job) {
      this.logger.debug(
        'Create new job application for job: ' +
          JSON.stringify(chunk.job_supplier.job.url),
      );
      const cvEntityId = chunk.job_supplier.cvEntityId;
      const job = await this.jobRepository.findOneByOrFail({
        url: chunk.job_supplier.job.url,
      });
      await this.jobApplicationRepository.save({
        userId: options.userId,
        cv: { id: cvEntityId },
        job,
        status: 'processing',
      });
    } else if (chunk.job_evaluator !== undefined) {
      await this.processJobEvaluatorChunk(chunk, options);
    } else if (chunk.cover_letter_generator !== undefined) {
      await this.processCoverLetterGeneratorChunk(chunk, options);
    }
  }

  private async processCoverLetterGeneratorChunk(
    chunk: StreamChunk,
    options: {
      maxJobs: number;
      linkedinEnabled: boolean;
      startupJobsEnabled: boolean;
      threadId: string;
      userId: string;
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
      where: {
        job: { url: chunk.cover_letter_generator!.url },
        cv: { id: chunk.cover_letter_generator!.cvEntityId },
        userId: options.userId,
      },
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
      userId: string;
    },
  ) {
    const counters: Partial<JobApplicationProcessingRun> = {};
    if (chunk.job_evaluator?.evaluatedJobsCount !== undefined) {
      if (
        chunk.job_evaluator.url &&
        chunk.job_evaluator.evaluationResult !== undefined
      ) {
        const application = await this.jobApplicationRepository.findOne({
          where: {
            job: { url: chunk.job_evaluator.url },
            cv: { id: chunk.job_evaluator.cvEntityId },
            userId: options.userId,
          },
        });
        if (application) {
          await this.jobApplicationRepository.update(application.id, {
            evaluationResult: chunk.job_evaluator.evaluationResult,
            reason: chunk.job_evaluator.evaluationReason ?? null,
          });
        }
      }
      this.logger.debug(
        'Evaluated Jobs Count: ' + chunk.job_evaluator.evaluatedJobsCount,
      );
      counters.evaluatedJobApplications =
        chunk.job_evaluator.evaluatedJobsCount;
    }
    if (chunk.job_evaluator?.uncertainJobsCount !== undefined) {
      this.logger.debug(
        'Uncertain Jobs Count: ' + chunk.job_evaluator.uncertainJobsCount,
      );
      counters.uncertainJobApplications =
        chunk.job_evaluator.uncertainJobsCount;
    }
    if (chunk.job_evaluator?.dismissedJobsCount !== undefined) {
      this.logger.debug(
        'Dismissed Jobs Count: ' + chunk.job_evaluator.dismissedJobsCount,
      );
      if (chunk.job_evaluator.isValidJob === false && chunk.job_evaluator.url) {
        const applicationToDismiss =
          await this.jobApplicationRepository.findOne({
            where: {
              job: { url: chunk.job_evaluator.url },
              cv: { id: chunk.job_evaluator.cvEntityId },
              userId: options.userId,
            },
          });
        if (applicationToDismiss) {
          await this.jobApplicationRepository.update(applicationToDismiss.id, {
            status: 'dismissed',
          });
        }
      }
      counters.dismissedJobApplications =
        chunk.job_evaluator.dismissedJobsCount;
    }
    if (Object.keys(counters).length > 0) {
      await this.jobApplicationProcessingRunRepository.update(
        { threadId: options.threadId },
        counters,
      );
    }
  }
}
