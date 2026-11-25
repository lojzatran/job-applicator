import { env } from '../utils/env';
import { Client } from 'langsmith';
import {
  DATASET_NAME,
  HOLDOUT_DATASET_NAME,
  HOLDOUT_DATASET_NAME_2,
} from './constants';
import { ensureDataset } from '../utils/langsmith-utils';
import { createLogger } from '@apps/shared';
import { cvs } from './data/cvs';
import { jobs } from './data/jobs';
import { cases, holdoutCases, holdoutCases2 } from './data/cases';

const logger = createLogger('job-evaluator-dataset');
const holdoutCasesByDatasetName = new Map([
  [HOLDOUT_DATASET_NAME, holdoutCases],
  [HOLDOUT_DATASET_NAME_2, holdoutCases2],
]);

async function main() {
  if (process.argv.includes('--llm') && !env.LANGSMITH_UPLOAD_RUNS) {
    return;
  }

  const client = new Client();
  const datasetName = env.DATASET_NAME ?? DATASET_NAME;
  const evaluationCases = holdoutCasesByDatasetName.get(datasetName) ?? cases;

  await ensureDataset(client, {
    name: datasetName,
    description: 'Dataset for testing job-evaluator node.',
    examples: evaluationCases.map((evaluationCase) => ({
      key: `${evaluationCase.cvId}:${jobs[evaluationCase.jobId].id}`,
      inputs: {
        parsedCv: cvs[evaluationCase.cvId],
        job: jobs[evaluationCase.jobId],
      },
      outputs: {
        isValidJob: evaluationCase.isValidJob,
      },
    })),
  });
}

if (require.main === module) {
  main().catch((e) => {
    logger.error(e);
    process.exit(1);
  });
}
