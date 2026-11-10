import type { OpenAIDecisions } from '@langchain/openai';
import type { Repository } from 'typeorm';
import { createLogger, type Cv } from '@apps/shared';
import type { CvService } from '../../cv/cv.service';
import type { Job } from '../../jobs/types';
import type { CvInput, JobEvaluation, JobEvaluator } from './job-evaluator';
import { JOB_FIT_QUESTIONS } from './jev/job-fit.questions';
import { buildJobFitState } from './jev/job-fit.state';
import { toJobFitAnswers } from './jev/job-fit.answers';
import { decideJobFit, toVerdict } from './jev/job-fit.decision';

/**
 * Job evaluation with System One model (OpenAI Decisions API).
 */
export class JevJobEvaluator implements JobEvaluator {
  private readonly logger = createLogger(JevJobEvaluator.name);

  constructor(
    private readonly decisions: OpenAIDecisions,
    private readonly cvService: CvService,
    private readonly cvRepository: Repository<Cv>,
  ) {}

  prepareCv(cvText: string): Promise<number> {
    return this.cvService.ensureParsedCv(cvText);
  }

  async evaluate(cv: CvInput, job: Job): Promise<JobEvaluation> {
    const cvEntity = await this.cvRepository.findOneByOrFail({
      id: cv.entityId,
    });
    const input = buildJobFitState(cvEntity, job);
    this.logger.debug({ input }, `Jev request for ${job.title}`);

    const { answers } = await this.decisions.invoke({
      input,
      questions: JOB_FIT_QUESTIONS,
    });
    this.logger.debug({ answers }, `Jev answers for ${job.title}`);

    const decision = decideJobFit(toJobFitAnswers(answers));
    this.logger.info({ decision }, `Jev decision for ${job.title}`);

    return { verdict: toVerdict(decision), score: decision.fit };
  }
}
