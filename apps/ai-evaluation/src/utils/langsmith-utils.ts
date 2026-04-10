import { Client, type Dataset } from 'langsmith';
import type { ExampleCreate } from 'langsmith/schemas';
import { createLogger } from '@apps/shared';

const logger = createLogger('langsmith-utils');

export interface DatasetExampleSeed {
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
}

export interface EnsureDatasetOptions {
  name: string;
  description: string;
  examples?: DatasetExampleSeed[];
}

export async function ensureDataset(
  client: Client,
  { name, description, examples = [] }: EnsureDatasetOptions,
): Promise<Dataset> {
  const hasDataset = await client.hasDataset({ datasetName: name });
  const dataset = hasDataset
    ? await client.readDataset({ datasetName: name })
    : await client.createDataset(name, { description });

  if (!hasDataset && examples.length > 0) {
    await client.createExamples(
      examples.map((example) => ({
        dataset_id: dataset.id,
        inputs: example.inputs,
        outputs: example.outputs,
      })) as ExampleCreate[],
    );
    logger.info(dataset, 'Created dataset');
  } else {
    logger.info(dataset, 'Dataset already exists');
  }

  return dataset;
}
