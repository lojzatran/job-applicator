import { Client, type Dataset } from 'langsmith';
import type { ExampleCreate } from 'langsmith/schemas';
import { createLogger } from '@apps/shared';

const logger = createLogger('langsmith-utils');

export interface DatasetExampleSeed {
  /** Stored as `metadata.key`. Examples with a key missing from an existing dataset are added. */
  key?: string;
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

  const newExamples = hasDataset
    ? await findMissingExamples(client, dataset, examples)
    : examples;

  if (newExamples.length > 0) {
    await client.createExamples(
      newExamples.map((example) => ({
        dataset_id: dataset.id,
        inputs: example.inputs,
        outputs: example.outputs,
        metadata: example.key ? { key: example.key } : undefined,
      })) as ExampleCreate[],
    );
    logger.info({ dataset, added: newExamples.length }, 'Added examples');
  } else {
    logger.info(dataset, 'Dataset is up to date');
  }

  return dataset;
}

/** Examples without a key are never added to an existing dataset. */
async function findMissingExamples(
  client: Client,
  dataset: Dataset,
  examples: DatasetExampleSeed[],
): Promise<DatasetExampleSeed[]> {
  const keyedExamples = examples.filter((example) => example.key);
  if (keyedExamples.length === 0) {
    return [];
  }

  const existingKeys = new Set<unknown>();
  for await (const example of client.listExamples({ datasetId: dataset.id })) {
    existingKeys.add(example.metadata?.key);
  }

  return keyedExamples.filter((example) => !existingKeys.has(example.key));
}
