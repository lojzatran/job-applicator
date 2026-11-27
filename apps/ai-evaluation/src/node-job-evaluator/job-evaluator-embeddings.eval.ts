import { env } from '../utils/env';
import { evaluate } from 'langsmith/evaluation';
import { FakeListChatModel } from '@langchain/core/utils/testing';
import type { Job } from '@apps/worker/src/app/jobs/types';
import { embeddingModelProvider } from '@apps/worker/src/app/ai/providers/embedding.provider';
import type { EmbeddingsWrapper } from '@apps/worker/src/app/ai/providers/embedding.types';
import { DATASET_NAME, EMBEDDING_EXPERIMENT_PREFIX } from './constants';
import {
  createEmbeddingAgentRuntime,
  parsedCvToText,
  type ParsedCv,
} from '../utils/agent-utils';
import { createLogger } from '@apps/shared';
import { createSummaryEval } from './summary-eval';

const logger = createLogger('job-evaluator-embedding-eval');

interface EvalInput {
  parsedCv: ParsedCv;
  job: Job;
}

async function correctnessEvaluator({
  outputs,
  example,
}: {
  outputs: Record<string, any>;
  example: Record<string, any>;
}) {
  const response = outputs.response;
  const score = outputs.score;
  const reference = example.outputs.isValidJob;

  return [
    { key: 'correctness', score: response === reference ? 1 : 0 },
    { key: 'score', score },
  ];
}

async function runNode(
  inputs: EvalInput,
  embeddingModel: EmbeddingsWrapper,
): Promise<{ response: boolean; score: number }> {
  const { parsedCv, job } = inputs;
  const cvText = parsedCvToText(parsedCv);
  // The graph constructor needs a chat model. This eval uses pre-parsed CVs.
  const chatModel = new FakeListChatModel({ responses: [] });
  const { cvEntityId, graph, prepareJobs, cleanup } =
    await createEmbeddingAgentRuntime(chatModel, embeddingModel, {
      cvText,
      parsedCv,
    });

  try {
    await prepareJobs([job]);
    const node = graph.nodes['job_evaluator'];
    const response = await node.invoke({
      cvEntityId,
      cvText,
      job,
    });
    const score = response.score;
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      throw new Error('Job evaluation did not return a finite score');
    }
    return { response: response.isValidJob, score };
  } finally {
    await cleanup();
  }
}

async function main() {
  const embeddingModel = embeddingModelProvider.useFactory();
  const results = await evaluate(
    (inputs: EvalInput) => runNode(inputs, embeddingModel),
    {
      data: env.DATASET_NAME ?? DATASET_NAME,
      evaluators: [correctnessEvaluator],
      summaryEvaluators: [createSummaryEval()],
      experimentPrefix: EMBEDDING_EXPERIMENT_PREFIX,
      maxConcurrency: 2,
      metadata: {
        models: [embeddingModel.modelName],
        evaluator: 'embedding',
      },
    },
  );

  logger.info(results);
}

if (require.main === module) {
  main().catch((e) => {
    logger.error(e);
    process.exit(1);
  });
}
