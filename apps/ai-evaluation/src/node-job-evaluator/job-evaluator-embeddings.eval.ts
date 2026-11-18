import { evaluate } from 'langsmith/evaluation';
import type { Job } from '@apps/worker/src/app/jobs/types';
import { DATASET_NAME, EXPERIMENT_PREFIX } from './constants';
import {
  createOllamaAgentRuntime,
  parsedCvToText,
  type ParsedCv,
} from '../utils/agent-utils';
import { createLogger } from '@apps/shared';
import { env } from '../utils/env';
import { summaryEval } from './summary-eval';

const logger = createLogger('job-evaluator-gemma4-e4b-eval');

// The graph needs a chat model at construction. This eval uses pre-parsed CVs.
const LLM_MODEL = 'gemma4:e4b';
const EMBEDDING_MODEL = env.EMBEDDING_MODEL;

async function correctnessEvaluator({
  outputs,
  example,
}: {
  outputs: Record<string, any>;
  example: Record<string, any>;
}) {
  const response = outputs.response;
  const reference = example.outputs.isValidJob;

  return { key: 'correctness', score: response === reference ? 1 : 0 };
}

async function runNode(inputs: {
  parsedCv: ParsedCv;
  job: Job;
}): Promise<{ response: boolean }> {
  const { parsedCv, job } = inputs;
  const cvText = parsedCvToText(parsedCv);
  const { cvEntityId, graph, prepareJobs, cleanup } =
    await createOllamaAgentRuntime(LLM_MODEL, EMBEDDING_MODEL, {
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
    return { response: response.isValidJob };
  } finally {
    await cleanup();
  }
}

async function main() {
  const results = await evaluate(runNode, {
    data: DATASET_NAME,
    evaluators: [correctnessEvaluator],
    summaryEvaluators: [summaryEval],
    experimentPrefix: EXPERIMENT_PREFIX,
    maxConcurrency: 2,
    metadata: {
      models: [EMBEDDING_MODEL],
      evaluator: 'embedding',
    },
  });

  logger.info(results);
}

if (require.main === module) {
  main().catch((e) => {
    logger.error(e);
    process.exit(1);
  });
}
