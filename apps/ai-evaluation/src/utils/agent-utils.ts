import { ChatOllama } from '@langchain/ollama';
import { LanggraphService } from '@apps/worker/src/app/ai/langgraph/langgraph.service';
import { OllamaEmbeddings } from '@langchain/ollama';
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
import { EmbeddingsWrapper } from '@apps/worker/src/app/ai/providers/embedding.types';
import { MemorySaver } from '@langchain/langgraph';
import { EmbeddingLlmJobEvaluator } from '@apps/worker/src/app/ai/job-evaluator/embedding-llm.job-evaluator';
import type { JobEvaluator } from '@apps/worker/src/app/ai/job-evaluator/job-evaluator';
import { JevJobEvaluator } from '@apps/worker/src/app/ai/job-evaluator/jev.job-evaluator';
import { decisionProvider } from '@apps/worker/src/app/ai/providers/decision.provider';
import * as crypto from 'crypto';

/** Same shape as `CvSchema` in the worker. */
export interface ParsedCv {
  summary: string;
  skills: string[];
  experience: string[];
  projects: string[];
  education: string[];
  other: string[];
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
): Promise<OllamaAgentRuntimeContext> {
  const llm = new ChatOllama({
    model: llmModelName,
    baseUrl: env.OLLAMA_BASE_URL,
  });

  const embeddingModel = new OllamaEmbeddings({
    model: embeddingModelName,
    baseUrl: env.OLLAMA_BASE_URL,
  }) as unknown as EmbeddingsWrapper;
  embeddingModel.modelName = embeddingModelName;

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
    const jobEvaluator = new EmbeddingLlmJobEvaluator(
      llm as any,
      cvEmbeddingsService,
      jobEmbeddingsService,
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

export async function seedCvEmbeddingsForRuntime(
  runtime: OllamaAgentRuntimeContext,
  cvText: string,
): Promise<number> {
  return runtime.jobEvaluator.prepareCv(cvText);
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

  const llm = new ChatOllama({
    model: llmModelName,
    baseUrl: env.OLLAMA_BASE_URL,
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
