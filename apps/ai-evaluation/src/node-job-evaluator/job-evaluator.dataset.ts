import { Client } from 'langsmith';
import { DATASET_NAME } from './constants';
import { ensureDataset } from '../utils/langsmith-utils';
import { createLogger } from '@apps/shared';
import { cvs } from './data/cvs';
import { jobs } from './data/jobs';
import { cases } from './data/cases';
import '../utils/env';

const logger = createLogger('job-evaluator-dataset');

async function main() {
  const client = new Client();

  await ensureDataset(client, {
    name: DATASET_NAME,
    description: 'Dataset for testing job-evaluator node.',
    examples: cases.map((evaluationCase) => ({
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
