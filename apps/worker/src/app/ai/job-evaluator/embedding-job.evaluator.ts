import { Injectable } from '@nestjs/common';
import { createLogger, JobEvaluationDecision } from '@apps/shared';
import { CvEmbeddingsService } from '../../cv/embeddings/cv-summary-embeddings.service';
import { JobEmbeddingsService } from '../../jobs/job-embeddings.service';
import type { Job } from '../../jobs/types';
import type { CvInput, JobEvaluation, JobEvaluator } from './job-evaluator';

const THRESHOLD = 0.9;

@Injectable()
export class EmbeddingJobEvaluator implements JobEvaluator {
  private readonly logger = createLogger(EmbeddingJobEvaluator.name);

  constructor(
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

    return {
      verdict:
        score > THRESHOLD
          ? JobEvaluationDecision.APPLY
          : JobEvaluationDecision.DISMISS,
      score,
    };
  }

  private async loadJobEmbeddings(job: Job) {
    await this.jobEmbeddingsService.ensureJobEmbeddings(job);
    return this.jobEmbeddingsService.getJobEmbeddings(job);
  }
}
