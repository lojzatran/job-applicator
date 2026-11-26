import { env } from '../utils/env';
import { evaluate } from 'langsmith/evaluation';
import { MemorySaver } from '@langchain/langgraph';
import { DataSource } from 'typeorm';
import { Cv, createLogger, dataSourceOptions } from '@apps/shared';
import { JevLlmJobEvaluator } from '@apps/worker/src/app/ai/job-evaluator/jev-llm.job-evaluator';
import { JevJobEvaluator } from '@apps/worker/src/app/ai/job-evaluator/jev.job-evaluator';
import { LlmJobEvaluator } from '@apps/worker/src/app/ai/job-evaluator/llm.job-evaluator';
import { LanggraphService } from '@apps/worker/src/app/ai/langgraph/langgraph.service';
import { decisionProvider } from '@apps/worker/src/app/ai/providers/decision.provider';
import { jobEvaluatorLlmProvider } from '@apps/worker/src/app/ai/providers/llm.provider';
import { CvService } from '@apps/worker/src/app/cv/cv.service';
import type { Job } from '@apps/worker/src/app/jobs/types';
import { DATASET_NAME, JEV_LLM_EXPERIMENT_PREFIX } from './constants';
import {
  parsedCvToText,
  seedParsedCv,
  type ParsedCv,
} from '../utils/agent-utils';
import { summaryEval } from './summary-eval';

const logger = createLogger('job-evaluator-jev-llm-eval');

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
  const decisions = decisionProvider.useFactory();
  if (!decisions) {
    throw new Error(
      'AI_GATEWAY_DECISION_MODEL must be set to evaluate Jev with an LLM fallback',
    );
  }

  const llm = jobEvaluatorLlmProvider.useFactory();
  if (!llm) {
    throw new Error(
      'Missing LLM job evaluator configuration. Check JOB_EVALUATOR_PROVIDER and its model and credentials.',
    );
  }

  const dataSource = await new DataSource(dataSourceOptions).initialize();
  try {
    const cvService = new CvService(llm, dataSource);
    const jobEvaluator = new JevLlmJobEvaluator(
      new JevJobEvaluator(decisions, cvService, dataSource.getRepository(Cv)),
      new LlmJobEvaluator(llm, cvService, dataSource),
    );
    const graph = await new LanggraphService(
      jobEvaluator,
      llm,
      llm,
      new MemorySaver(),
    ).build();
    const node = graph.nodes['job_evaluator'];

    async function runNode({ parsedCv, job }: EvalInput) {
      const cvEntityId = await seedParsedCv(parsedCv);
      const cvText = parsedCvToText(parsedCv);
      const result = await node.invoke({ cvEntityId, cvText, job });
      if (result.evaluationResult === undefined) {
        throw new Error(`Jev + LLM job evaluation failed for ${job.url}`);
      }
      return {
        response: result.isValidJob,
        verdict: result.evaluationResult,
        reason: result.evaluationReason ?? null,
      };
    }

    const datasetName = env.DATASET_NAME ?? DATASET_NAME;
    const uploadRuns = env.LANGSMITH_UPLOAD_RUNS;
    const results = await evaluate(runNode, {
      data: datasetName,
      uploadRuns,
      evaluators: [correctnessEvaluator],
      summaryEvaluators: [summaryEval],
      experimentPrefix: JEV_LLM_EXPERIMENT_PREFIX,
      maxConcurrency: 2,
      metadata: {
        models: [decisions.model, llm.model],
        evaluator: 'jev_llm',
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
        'Jev + LLM evaluation finished without uploading runs',
      );
    }
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((error) => {
    logger.error(error);
    process.exit(1);
  });
}
