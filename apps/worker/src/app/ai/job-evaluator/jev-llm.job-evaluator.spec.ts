import { JobEvaluationDecision } from '@apps/shared';
import type { Job } from '../../jobs/types';
import type { CvInput, JobEvaluation, JobEvaluator } from './job-evaluator';
import { JevLlmJobEvaluator } from './jev-llm.job-evaluator';

describe('JevLlmJobEvaluator', () => {
  const cv: CvInput = { entityId: 1, text: 'Software engineer CV' };
  const job: Job = {
    id: 'software-engineer',
    title: 'Software Engineer',
    description: 'Build and maintain web applications',
    company: 'Example',
    url: 'https://example.com/jobs/software-engineer',
    source: 'linkedin',
  };
  const jevResult: JobEvaluation = {
    verdict: JobEvaluationDecision.UNCERTAIN,
    score: 0.65,
    reason: 'borderline_fit',
  };

  let llm: jest.Mocked<JobEvaluator>;
  let evaluator: JevLlmJobEvaluator;

  beforeEach(() => {
    const jev: JobEvaluator = {
      prepareCv: jest.fn(),
      evaluate: jest.fn().mockResolvedValue(jevResult),
    };
    llm = { prepareCv: jest.fn(), evaluate: jest.fn() };
    evaluator = new JevLlmJobEvaluator(jev, llm);
  });

  it('calls the LLM when Jev returns uncertain', async () => {
    llm.evaluate.mockResolvedValue({
      verdict: JobEvaluationDecision.APPLY,
      score: 1,
    });

    await evaluator.evaluate(cv, job);
    expect(llm.evaluate).toHaveBeenCalledWith(cv, job);
  });

  it('returns the Jev verdict when the LLM call fails', async () => {
    llm.evaluate.mockRejectedValue(new Error('LLM unavailable'));

    await expect(evaluator.evaluate(cv, job)).resolves.toBe(jevResult);
  });
});
