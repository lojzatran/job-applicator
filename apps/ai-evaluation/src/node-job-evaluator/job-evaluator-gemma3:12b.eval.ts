import { evaluate } from 'langsmith/evaluation';
import type { Job } from '@apps/api/src/app/jobs/types';
import { DATASET_NAME, EXPERIMENT_PREFIX } from './constants';
import { createOllamaAgentGraph } from '../utils/agent-utils';

const LLM_MODEL = 'gemma3:12b';

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

async function runNode(inputs: { cvText: string; job: Job }): Promise<{ response: boolean }> {
  const { cvText, job } = inputs;
  const graph = createOllamaAgentGraph(LLM_MODEL);
  const node = graph.nodes['job_evaluator'];
  const response = await node.invoke({
    cvText,
    job,
  });
  return { response: response.isValidJob };
}

async function main() {
  const results = await evaluate(runNode, {
    data: DATASET_NAME,
    evaluators: [correctnessEvaluator],
    experimentPrefix: EXPERIMENT_PREFIX,
    maxConcurrency: 2,
  });

  console.log(results);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
