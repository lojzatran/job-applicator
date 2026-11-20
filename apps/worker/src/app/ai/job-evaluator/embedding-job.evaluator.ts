import { createLogger, JobEvaluationDecision } from '@apps/shared';
import type { CvEmbeddingsService } from '../../cv/embeddings/cv-summary-embeddings.service';
import type { JobEmbeddingsService } from '../../jobs/job-embeddings.service';
import type { Job } from '../../jobs/types';
import type { CvInput, JobEvaluation, JobEvaluator } from './job-evaluator';

export class EmbeddingJobEvaluator implements JobEvaluator {
  private readonly logger = createLogger(EmbeddingJobEvaluator.name);

  constructor(
    private readonly cvEmbeddingsService: CvEmbeddingsService,
    private readonly jobEmbeddingsService: JobEmbeddingsService,
    private readonly threshold: number,
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
        score > this.threshold
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
