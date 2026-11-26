import { createLogger, JobEvaluationDecision } from '@apps/shared';
import type { Job } from '../../jobs/types';
import type { CvInput, JobEvaluation, JobEvaluator } from './job-evaluator';

export class JevLlmJobEvaluator implements JobEvaluator {
  private readonly logger = createLogger(JevLlmJobEvaluator.name);

  constructor(
    private readonly jevJobEvaluator: JobEvaluator,
    private readonly llmJobEvaluator: JobEvaluator,
  ) {}

  prepareCv(cvText: string): Promise<number> {
    return this.jevJobEvaluator.prepareCv(cvText);
  }

  async evaluate(cv: CvInput, job: Job): Promise<JobEvaluation> {
    const jevResult = await this.jevJobEvaluator.evaluate(cv, job);
    if (jevResult.verdict === JobEvaluationDecision.UNCERTAIN) {
      this.logger.info({ jobUrl: job.url }, 'Calling the LLM fallback');
      try {
        const llmResult = await this.llmJobEvaluator.evaluate(cv, job);
        // A role mismatch can mask requirements that Jev could not verify.
        return llmResult.verdict === JobEvaluationDecision.DISMISS
          ? llmResult
          : jevResult;
      } catch (error) {
        this.logger.warn(
          { err: error, jobUrl: job.url },
          'LLM fallback failed, keeping the Jev verdict',
        );
      }
    }
    return jevResult;
  }
}
