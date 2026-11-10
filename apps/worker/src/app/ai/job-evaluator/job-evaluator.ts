import type { Job } from '../../jobs/types';

export interface JobEvaluation {
  verdict: 'apply' | 'dismiss';
  /** Higher means a better match. Comparable only within one implementation. */
  score: number;
}

export interface CvInput {
  /** Id returned by `JobEvaluator.prepareCv`. */
  entityId: number;
  text: string;
}

export interface JobEvaluator {
  /** Prepares the CV for evaluation and returns its entity id. */
  prepareCv(cvText: string): Promise<number>;
  evaluate(cv: CvInput, job: Job): Promise<JobEvaluation>;
}
