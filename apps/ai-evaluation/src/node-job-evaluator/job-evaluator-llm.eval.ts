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
      'Missing LLM job evaluator configuration. Check JOB_EVALUATOR_PROVIDER and its model and credentials.',
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
      if (result.isValidJob) {
        return { response: true };
      }
      return {
        response: false,
        score: result.score,
        reason: result.evaluationReason,
      };
    }

    const datasetName = env.DATASET_NAME ?? DATASET_NAME;
    const uploadRuns = env.LANGSMITH_UPLOAD_RUNS;
    const results = await evaluate(runNode, {
      data: datasetName,
      uploadRuns,
      evaluators: [correctnessEvaluator],
      summaryEvaluators: [summaryEval],
      experimentPrefix: LLM_EXPERIMENT_PREFIX,
      maxConcurrency: 2,
      metadata: {
        models: [llm.model],
        evaluator: 'llm',
      },
    });

    if (uploadRuns) {
      logger.info(results);
    } else {
      logger.info(
        {
          datasetName,
          totalPairs: results.length,
          metrics: results.summaryResults.results,
        },
        'LLM evaluation finished without uploading runs',
      );
    }
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
