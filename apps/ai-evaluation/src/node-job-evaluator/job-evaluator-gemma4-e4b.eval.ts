import { evaluate } from 'langsmith/evaluation';
import type { Job } from '@apps/worker/src/app/jobs/types';
import { DATASET_NAME, EXPERIMENT_PREFIX } from './constants';
import {
  createOllamaAgentRuntime,
  parsedCvToText,
  seedCvEmbeddingsForRuntime,
  type ParsedCv,
} from '../utils/agent-utils';
import { createLogger } from '@apps/shared';

const logger = createLogger('job-evaluator-gemma4-e4b-eval');

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
  const runtime = await createOllamaAgentRuntime(LLM_MODEL);

  try {
    const cvText = parsedCvToText(parsedCv);
    const cvEntityId = await seedCvEmbeddingsForRuntime(runtime, cvText);
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
    experimentPrefix: EXPERIMENT_PREFIX,
    maxConcurrency: 2,
  });

  logger.info(results);
}

if (require.main === module) {
  main().catch((e) => {
    logger.error(e);
    process.exit(1);
  });
}
