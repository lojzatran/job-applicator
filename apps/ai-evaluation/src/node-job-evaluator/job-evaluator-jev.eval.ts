import { evaluate } from 'langsmith/evaluation';
import type { Job } from '@apps/worker/src/app/jobs/types';
import { DATASET_NAME, JEV_EXPERIMENT_PREFIX } from './constants';
import {
  createJevAgentRuntime,
  parsedCvToText,
  seedParsedCv,
  type ParsedCv,
} from '../utils/agent-utils';
import { createLogger } from '@apps/shared';
import { env } from '@apps/worker/src/utils/env';
import { Example, Run } from 'langsmith/schemas';

const logger = createLogger('job-evaluator-jev-eval');

// Not called: the CV is already parsed and the job is evaluated by Jev.
// createJevAgentRuntime still needs it to build the graph.
const LLM_MODEL = 'gemma4:e4b';

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
  const runtime = await createJevAgentRuntime(LLM_MODEL);

  try {
    const cvText = parsedCvToText(parsedCv);
    const cvEntityId = await seedParsedCv(parsedCv);
    await runtime.prepareJobs([job]);
    const { graph } = runtime;
    const node = graph.nodes['job_evaluator'];
    const response = await node.invoke({
      cvEntityId,
      cvText,
      job,
    });
    return { response: response.isValidJob };
  } finally {
    await runtime.cleanup();
  }
}

async function main() {
  const results = await evaluate(runNode, {
    data: DATASET_NAME,
    evaluators: [correctnessEvaluator],
    summaryEvaluators: [summaryEval],
    experimentPrefix: JEV_EXPERIMENT_PREFIX,
    maxConcurrency: 2,
    metadata: {
      models: env.AI_GATEWAY_DECISION_MODEL
        ? [env.AI_GATEWAY_DECISION_MODEL]
        : [],
      evaluator: 'jev',
    },
  });

  logger.info(results);
}

function summaryEval({
  outputs,
  referenceOutputs,
}: {
  runs: Array<Run>;
  examples: Array<Example>;
  inputs: Array<Record<string, any>>;
  outputs: Array<Record<string, any>>;
  referenceOutputs?: Array<Record<string, any>>;
}) {
  if (!referenceOutputs) {
    return [];
  }

  const diff = outputs.reduce((count, currentValue, i) => {
    return currentValue.response === referenceOutputs[i].isValidJob
      ? count
      : count + 1;
  }, 0);
  const correctProcessedPairs = outputs.length - diff;
  const processedPairs = outputs.length;
  const accuracy =
    processedPairs === 0 ? undefined : correctProcessedPairs / processedPairs;

  const correctMatchedPairsCount = outputs.reduce((count, currentValue, i) => {
    return currentValue.response === true &&
      currentValue.response === referenceOutputs[i].isValidJob
      ? count + 1
      : count;
  }, 0);
  const aiMatchedPairs = outputs.reduce((count, currentValue) => {
    return currentValue.response === true ? count + 1 : count;
  }, 0);
  const allMatchedPairs = referenceOutputs.reduce((count, currentValue) => {
    return currentValue.isValidJob === true ? count + 1 : count;
  }, 0);
  const precision =
    aiMatchedPairs === 0
      ? undefined
      : correctMatchedPairsCount / aiMatchedPairs;
  const recall =
    allMatchedPairs === 0
      ? undefined
      : correctMatchedPairsCount / allMatchedPairs;

  const f1 =
    precision === undefined || recall === undefined
      ? undefined
      : precision === 0 && recall === 0
        ? 0
        : (2 * precision * recall) / (precision + recall);

  return [
    { key: 'f1', score: f1 },
    { key: 'precision', score: precision },
    { key: 'recall', score: recall },
    { key: 'accuracy', score: accuracy },
  ];
}

if (require.main === module) {
  main().catch((e) => {
    logger.error(e);
    process.exit(1);
  });
}
