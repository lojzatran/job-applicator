import { Inject, Injectable } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { createLogger } from '@apps/shared';
import { JOB_EVALUATOR_LLM } from '../ai.constants';
import { CvEmbeddingsService } from '../../cv/embeddings/cv-summary-embeddings.service';
import { JobEmbeddingsService } from '../../jobs/job-embeddings.service';
import type { Job } from '../../jobs/types';
import type { CvInput, JobEvaluation, JobEvaluator } from './job-evaluator';

const THRESHOLD = 0.9;

@Injectable()
export class EmbeddingLlmJobEvaluator implements JobEvaluator {
  private readonly logger = createLogger(EmbeddingLlmJobEvaluator.name);

  constructor(
    @Inject(JOB_EVALUATOR_LLM)
    private readonly jobEvaluatorLlm: BaseChatModel,
    private readonly cvEmbeddingsService: CvEmbeddingsService,
    private readonly jobEmbeddingsService: JobEmbeddingsService,
  ) {}

  prepareCv(cvText: string): Promise<number> {
    return this.cvEmbeddingsService.ensureCvAndEmbeddings(cvText);
  }

  async evaluate(cv: CvInput, job: Job): Promise<JobEvaluation> {
    const jobDescriptionEmbedding = await this.loadJobEmbeddings(job);
    const score = await this.cvEmbeddingsService.getJobAndCvMatchingScore(
      cv.entityId,
      jobDescriptionEmbedding,
    );

    this.logger.info(`Job score for ${job.title}: ${score}`);

    if (score > THRESHOLD) {
      const isValidJob = await this.evaluateByLlm(cv.text, job);
      return { verdict: isValidJob ? 'apply' : 'dismiss', score };
    }

    return { verdict: 'dismiss', score };
  }

  private async loadJobEmbeddings(job: Job) {
    await this.jobEmbeddingsService.ensureJobEmbeddings(job);
    return this.jobEmbeddingsService.getJobEmbeddings(job);
  }

  private async evaluateByLlm(cvText: string, job: Job): Promise<boolean> {
    const template = PromptTemplate.fromTemplate(`
          You are an experienced technical recruiter and hiring manager.

          Your task is to evaluate if a candidate matches a job description.

          RULES:
          - Be strict and realistic.
          - The candidate should meet most core requirements (not everything, but clearly relevant).
          - Ignore minor or nice-to-have requirements.
          - Focus on actual ability to do the job, not just keyword matching.

          INPUTS:
          1) Candidate CV:
          {cvText}

          2) Job Title:
          {jobTitle}

          3) Job Description:
          {jobDescription}

          OUTPUT:
          - Return a JSON object with the key "isValidJob" set to true if the candidate meets most core requirements.
          - Set "isValidJob" to false otherwise.
          - Example: {{ "isValidJob": true }}
        `);

    const prompt = await template.invoke({
      cvText,
      jobTitle: job.title,
      jobDescription: job.description,
    });

    const response = await this.jobEvaluatorLlm
      .withStructuredOutput(
        z.object({
          isValidJob: z.union([z.boolean(), z.string()]),
        }),
      )
      .invoke(prompt);
    this.logger.info(`Evaluated job by LLM: ${JSON.stringify(response)}`);
    return typeof response.isValidJob === 'boolean'
      ? response.isValidJob
      : response.isValidJob.trim().toLowerCase() === 'true';
  }
}
