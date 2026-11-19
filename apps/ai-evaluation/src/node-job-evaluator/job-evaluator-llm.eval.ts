import { env } from '../utils/env';
import { evaluate } from 'langsmith/evaluation';
import { MemorySaver } from '@langchain/langgraph';
import { DataSource } from 'typeorm';
import { createLogger, dataSourceOptions } from '@apps/shared';
import { LlmJobEvaluator } from '@apps/worker/src/app/ai/job-evaluator/llm.job-evaluator';
import { LanggraphService } from '@apps/worker/src/app/ai/langgraph/langgraph.service';
import { jobEvaluatorLlmProvider } from '@apps/worker/src/app/ai/providers/llm.provider';
import { CvService } from '@apps/worker/src/app/cv/cv.service';
import type { Job } from '@apps/worker/src/app/jobs/types';
import { DATASET_NAME, LLM_EXPERIMENT_PREFIX } from './constants';
import { parsedCvToText, type ParsedCv } from '../utils/agent-utils';
import { summaryEval } from './summary-eval';

const logger = createLogger('job-evaluator-llm-eval');

interface EvalInput {
  parsedCv: ParsedCv;
  job: Job;
}

function correctnessEvaluator({
  outputs,
  referenceOutputs,
}: {
  outputs?: Record<string, unknown>;
  referenceOutputs?: Record<string, unknown>;
}) {
  const response = outputs?.response;
  return {
    key: 'correctness',
    score:
      typeof response === 'boolean' && response === referenceOutputs?.isValidJob
        ? 1
        : 0,
  };
}

async function main() {
  const llm = jobEvaluatorLlmProvider.useFactory();
  if (!llm) {
    throw new Error(
      'JOB_EVALUATOR_METHOD must be set to llm to run the LLM job evaluation',
    );
  }
  const dataSource = await new DataSource(dataSourceOptions).initialize();

  try {
    const cvService = new CvService(llm, dataSource);
    const jobEvaluator = new LlmJobEvaluator(llm, cvService, dataSource);
    const graph = await new LanggraphService(
      jobEvaluator,
      llm,
      llm,
      new MemorySaver(),
    ).build();
    const node = graph.nodes['job_evaluator'];

    async function runNode({ parsedCv, job }: EvalInput) {
      const cvText = parsedCvToText(parsedCv);
      const cvEntityId = await jobEvaluator.prepareCv(cvText);
      const result = await node.invoke({ cvEntityId, cvText, job });
      // A failed graph node returns false without an evaluation result.
      if (result.evaluationResult === undefined) {
        throw new Error(`LLM job evaluation failed for ${job.url}`);
      }
      return { response: result.isValidJob };
    }

    const results = await evaluate(runNode, {
      data: env.DATASET_NAME ?? DATASET_NAME,
      evaluators: [correctnessEvaluator],
      summaryEvaluators: [summaryEval],
      experimentPrefix: LLM_EXPERIMENT_PREFIX,
      maxConcurrency: 2,
      metadata: {
        models: [llm.model],
        evaluator: 'llm',
      },
    });

    logger.info(results);
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((e) => {
    logger.error(e);
    process.exit(1);
  });
}
