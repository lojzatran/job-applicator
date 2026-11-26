import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { OpenAIDecisions } from '@langchain/openai';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import type { DataSource, Repository } from 'typeorm';
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
import { EmbeddingJobEvaluator } from '../job-evaluator/embedding-job.evaluator';
import { JevLlmJobEvaluator } from '../job-evaluator/jev-llm.job-evaluator';
import { JevJobEvaluator } from '../job-evaluator/jev.job-evaluator';
import { LlmJobEvaluator } from '../job-evaluator/llm.job-evaluator';

export function createJobEvaluator(
  cvEmbeddingsService: CvEmbeddingsService,
  jobEmbeddingsService: JobEmbeddingsService,
  decisions: OpenAIDecisions | null,
  cvRepository: Repository<Cv>,
  cvService: CvService,
  jobEvaluatorLlm: BaseChatModel | null,
  dataSource: DataSource,
): JobEvaluator {
  switch (env.JOB_EVALUATOR_METHOD) {
    case 'jev':
      if (!decisions) {
        throw new Error(
          'AI_GATEWAY_DECISION_MODEL must be set when JOB_EVALUATOR_METHOD=jev',
        );
      }
      return new JevJobEvaluator(decisions, cvService, cvRepository);
    case 'embedding':
      return new EmbeddingJobEvaluator(
        cvEmbeddingsService,
        jobEmbeddingsService,
        env.JOB_EVALUATOR_EMBEDDING_THRESHOLD,
      );
    case 'llm':
      if (!jobEvaluatorLlm) {
        throw new Error(
          'A chat model must be configured for JOB_EVALUATOR_METHOD=llm',
        );
      }
      return new LlmJobEvaluator(jobEvaluatorLlm, cvService, dataSource);
    case 'jev_llm':
      if (!decisions || !jobEvaluatorLlm) {
        throw new Error(
          'A decision model and a chat model must be configured for JOB_EVALUATOR_METHOD=jev_llm. Check AI_GATEWAY_DECISION_MODEL and the chat model settings for JOB_EVALUATOR_PROVIDER.',
        );
      }
      return new JevLlmJobEvaluator(
        new JevJobEvaluator(decisions, cvService, cvRepository),
        new LlmJobEvaluator(jobEvaluatorLlm, cvService, dataSource),
      );
  }
}

export const jobEvaluatorProvider = {
  provide: JOB_EVALUATOR,
  useFactory: createJobEvaluator,
  inject: [
    CvEmbeddingsService,
    JobEmbeddingsService,
    DECISION_MODEL,
    getRepositoryToken(Cv),
    CvService,
    JOB_EVALUATOR_LLM,
    getDataSourceToken(),
  ],
};
