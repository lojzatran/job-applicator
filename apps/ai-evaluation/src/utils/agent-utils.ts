import { LanggraphService } from '@apps/worker/src/app/ai/langgraph/langgraph.service';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { env } from './env';
import { CvEmbeddingsService } from '@apps/worker/src/app/cv/embeddings/cv-summary-embeddings.service';
import { CvService } from '@apps/worker/src/app/cv/cv.service';
import { CvEmbeddingsRepository } from '@apps/worker/src/app/cv/embeddings/cv-embeddings.repository';
import { DataSource } from 'typeorm';
import {
  Cv,
  dataSourceOptions,
  Job as JobEntity,
  JobEmbedding,
} from '@apps/shared';
import type { Job } from '@apps/worker/src/app/jobs/types';
import { JobEmbeddingsService } from '@apps/worker/src/app/jobs/job-embeddings.service';
import { MemorySaver } from '@langchain/langgraph';
import { EmbeddingJobEvaluator } from '@apps/worker/src/app/ai/job-evaluator/embedding-job.evaluator';
import type { JobEvaluator } from '@apps/worker/src/app/ai/job-evaluator/job-evaluator';
import { JevJobEvaluator } from '@apps/worker/src/app/ai/job-evaluator/jev.job-evaluator';
import { decisionProvider } from '@apps/worker/src/app/ai/providers/decision.provider';
import * as crypto from 'crypto';

const ollamaBaseURL = env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1';

/** Same shape as `CvSchema` in the worker. */
export interface ParsedCv {
  summary: string;
  skills: string[];
  experience: string[];
  projects: string[];
  education: string[];
  other: string[];
}

interface ParsedCvInput {
  cvText: string;
  parsedCv: ParsedCv;
}

interface OllamaAgentGraphContext {
  graph: Awaited<ReturnType<InstanceType<typeof LanggraphService>['build']>>;
  prepareJobs: (jobs: Job[]) => Promise<void>;
  cleanup: () => Promise<void>;
}

export interface OllamaAgentRuntimeContext extends OllamaAgentGraphContext {
  jobEvaluator: JobEvaluator;
}

export async function createOllamaAgentRuntime(
  llmModelName: string,
  embeddingModelName: string = env.EMBEDDING_MODEL,
  cv?: ParsedCvInput,
): Promise<OllamaAgentRuntimeContext & { cvEntityId: number | undefined }> {
  const llm = new ChatOpenAI({
    model: llmModelName,
    apiKey: 'ollama',
    configuration: { baseURL: ollamaBaseURL },
  });
  const embeddingModel = new OpenAIEmbeddings({
    model: embeddingModelName,
    apiKey: 'ollama',
    configuration: { baseURL: ollamaBaseURL },
    stripNewLines: false,
    encodingFormat: 'float',
  });

  const cvEmbeddingsRepository = new CvEmbeddingsRepository();
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  const checkpointer = new MemorySaver();

  try {
    const cvService = new CvService(llm as any, dataSource);
    const cvEmbeddingsService = new CvEmbeddingsService(
      cvService,
      embeddingModel,
      cvEmbeddingsRepository as any,
      dataSource,
    );

    const jobEmbeddingsService = new JobEmbeddingsService(
      dataSource.getRepository(JobEmbedding),
      dataSource.getRepository(JobEntity),
      cvEmbeddingsService,
      embeddingModel,
    );
    const jobEvaluator = new EmbeddingJobEvaluator(
      cvEmbeddingsService,
      jobEmbeddingsService,
    );
    const langgraphService = new LanggraphService(
      jobEvaluator,
      llm as any,
      llm as any,
      checkpointer as any,
    );

    const graph = await langgraphService.build();
    const cvEntityId = cv
      ? await prepareCvEmbeddings(
          dataSource,
          cvService,
          cvEmbeddingsService,
          embeddingModelName,
          cv,
        )
      : undefined;

    return {
      graph,
      jobEvaluator,
      cvEntityId,
      prepareJobs: async (jobs) => {
        for (const job of jobs) {
          await dataSource.getRepository(JobEntity).upsert(
            {
              url: job.url,
              title: job.title,
              description: job.description,
              company: job.company,
              source: job.source,
            },
            ['url'],
          );
          await jobEmbeddingsService.ensureJobEmbeddings(job);
        }
      },
      cleanup: async () => {
        await dataSource.destroy();
      },
    };
  } catch (error) {
    await dataSource.destroy();
    throw error;
  }
}

function prepareCvEmbeddings(
  dataSource: DataSource,
  cvService: CvService,
  cvEmbeddingsService: CvEmbeddingsService,
  embeddingModelName: string,
  { cvText, parsedCv }: ParsedCvInput,
): Promise<number> {
  return dataSource.transaction(async (manager) => {
    const cvEntity = await cvService.ensureCvEntity(manager, cvText);
    if (!cvEntity.skills) {
      await manager.update(Cv, cvEntity.id, parsedCv);
      Object.assign(cvEntity, parsedCv);
    }
    await cvEmbeddingsService.ensureCvEmbeddings(
      manager,
      cvEntity,
      embeddingModelName,
    );
    return cvEntity.id;
  });
}

export async function createOllamaAgentGraph(
  llmModelName: string,
  embeddingModelName: string = env.EMBEDDING_MODEL,
): Promise<OllamaAgentGraphContext> {
  const runtime = await createOllamaAgentRuntime(
    llmModelName,
    embeddingModelName,
  );

  return {
    graph: runtime.graph,
    prepareJobs: runtime.prepareJobs,
    cleanup: runtime.cleanup,
  };
}

/**
 * Same runtime as `createOllamaAgentRuntime`, but jobs are evaluated by Jev.
 * The Ollama model only parses the CV. The decisions model and API key come
 * from AI_GATEWAY_DECISION_MODEL and AI_GATEWAY_API_KEY in the root `.env`.
 */
export async function createJevAgentRuntime(
  llmModelName: string,
): Promise<OllamaAgentRuntimeContext> {
  const decisions = decisionProvider.useFactory();
  if (!decisions) {
    throw new Error('AI_GATEWAY_DECISION_MODEL must be set to evaluate Jev');
  }

  const llm = new ChatOpenAI({
    model: llmModelName,
    apiKey: 'ollama',
    configuration: { baseURL: ollamaBaseURL },
  });

  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  const checkpointer = new MemorySaver();

  try {
    const cvService = new CvService(llm as any, dataSource);

    const jobEvaluator = new JevJobEvaluator(
      decisions,
      cvService,
      dataSource.getRepository(Cv),
    );
    const langgraphService = new LanggraphService(
      jobEvaluator,
      llm as any,
      llm as any,
      checkpointer as any,
    );

    return {
      graph: await langgraphService.build(),
      jobEvaluator,
      prepareJobs: async (jobs) => {
        for (const job of jobs) {
          await dataSource.getRepository(JobEntity).upsert(
            {
              url: job.url,
              title: job.title,
              description: job.description,
              company: job.company,
              source: job.source,
            },
            ['url'],
          );
        }
      },
      cleanup: async () => {
        await dataSource.destroy();
      },
    };
  } catch (error) {
    await dataSource.destroy();
    throw error;
  }
}

/** Joins the parsed CV sections into the plain text the graph keeps in `cvText`. */
export function parsedCvToText(parsedCv: ParsedCv): string {
  return Object.entries(parsedCv)
    .map(([section, value]) => {
      const content = Array.isArray(value) ? value.join('\n') : value;
      return `${section}:\n${content}`;
    })
    .join('\n\n');
}

/**
 * Stores the already parsed CV and returns its id, which is what the Jev
 * evaluator loads the CV by. A random hash keeps each call its own row.
 */
export async function seedParsedCv(parsedCv: ParsedCv): Promise<number> {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  try {
    const { identifiers } = await dataSource.getRepository(Cv).insert({
      path: 'temp',
      rawText: parsedCvToText(parsedCv),
      hash: crypto.randomUUID(),
      ...parsedCv,
    });
    return identifiers[0].id;
  } finally {
    await dataSource.destroy();
  }
}
