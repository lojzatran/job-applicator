import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { OpenAIDecisions } from '@langchain/openai';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Cv } from '@apps/shared';
import {
  DECISION_MODEL,
  JOB_EVALUATOR,
  JOB_EVALUATOR_LLM,
} from '../ai.constants';
import { env } from '../../../utils/env';
import { CvEmbeddingsService } from '../../cv/embeddings/cv-summary-embeddings.service';
import { CvService } from '../../cv/cv.service';
import { JobEmbeddingsService } from '../../jobs/job-embeddings.service';
import type { JobEvaluator } from '../job-evaluator/job-evaluator';
import { EmbeddingLlmJobEvaluator } from '../job-evaluator/embedding-llm.job-evaluator';
import { JevJobEvaluator } from '../job-evaluator/jev.job-evaluator';

export function createJobEvaluator(
  jobEvaluatorLlm: BaseChatModel,
  cvEmbeddingsService: CvEmbeddingsService,
  jobEmbeddingsService: JobEmbeddingsService,
  decisions: OpenAIDecisions | null,
  cvRepository: Repository<Cv>,
  cvService: CvService,
): JobEvaluator {
  switch (env.JOB_EVALUATOR_METHOD) {
    case 'jev':
      if (!decisions) {
        throw new Error(
          'AI_GATEWAY_DECISION_MODEL must be set when JOB_EVALUATOR_METHOD=jev',
        );
      }
      return new JevJobEvaluator(decisions, cvService, cvRepository);
    case 'embedding_llm':
      return new EmbeddingLlmJobEvaluator(
        jobEvaluatorLlm,
        cvEmbeddingsService,
        jobEmbeddingsService,
      );
  }
}

export const jobEvaluatorProvider = {
  provide: JOB_EVALUATOR,
  useFactory: createJobEvaluator,
  inject: [
    JOB_EVALUATOR_LLM,
    CvEmbeddingsService,
    JobEmbeddingsService,
    DECISION_MODEL,
    getRepositoryToken(Cv),
    CvService,
  ],
};
