import { env } from '../utils/env';
import { evaluate } from 'langsmith/evaluation';
import type { OpenAIDecisions } from '@langchain/openai';
import { decisionProvider } from '@apps/worker/src/app/ai/providers/decision.provider';
import type { Job } from '@apps/worker/src/app/jobs/types';
import { DATASET_NAME, JEV_EXPERIMENT_PREFIX } from './constants';
import {
  createJevAgentRuntime,
  parsedCvToText,
  seedParsedCv,
  type ParsedCv,
} from '../utils/agent-utils';
import {
  createLogger,
  type JobEvaluationDecision,
  type JobEvaluationReason,
} from '@apps/shared';
import { createSummaryEval } from './summary-eval';

const logger = createLogger('job-evaluator-jev-eval');

// Not called: the CV is already parsed and the job is evaluated by Jev.
// createJevAgentRuntime still needs it to build the graph.
const LLM_MODEL = 'gemma4:e4b';

interface EvalInput {
  parsedCv: ParsedCv;
  job: Job;
}

interface EvalOutput {
  response: boolean;
  verdict: JobEvaluationDecision | null;
  reason: JobEvaluationReason | null;
}

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

async function runNode(
  { parsedCv, job }: EvalInput,
  decisions: OpenAIDecisions,
): Promise<EvalOutput> {
  const runtime = await createJevAgentRuntime(LLM_MODEL, decisions);

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
    return {
      response: response.isValidJob,
      verdict: response.evaluationResult ?? null,
      reason: response.evaluationReason ?? null,
    };
  } finally {
    await runtime.cleanup();
  }
}

async function main() {
  const decisions = decisionProvider.useFactory();
  if (!decisions) {
    throw new Error('AI_GATEWAY_DECISION_MODEL must be set to evaluate Jev');
  }

  const results = await evaluate(
    (inputs: EvalInput) => runNode(inputs, decisions),
    {
      data: env.DATASET_NAME ?? DATASET_NAME,
      evaluators: [correctnessEvaluator],
      summaryEvaluators: [createSummaryEval()],
      experimentPrefix: JEV_EXPERIMENT_PREFIX,
      maxConcurrency: 2,
      metadata: {
        models: [decisions.model],
        evaluator: 'jev',
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
