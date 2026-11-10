import { ChatOllama } from '@langchain/ollama';
import { LanggraphService } from '@apps/api/src/app/ai/langgraph/langgraph.service';
import { OllamaEmbeddings } from '@langchain/ollama';
import { env } from './env';
import { CvEmbeddingsService } from '@apps/api/src/app/cv/embeddings/cv-summary-embeddings.service';
import { CvEmbeddingsRepository } from '@apps/api/src/app/cv/embeddings/cv-embeddings.repository';
import { DataSource } from 'typeorm';
import {
  dataSourceOptions,
  Job as JobEntity,
  JobEmbedding,
} from '@apps/shared';
import type { Job } from '@apps/api/src/app/jobs/types';
import { JobEmbeddingsService } from '@apps/api/src/app/jobs/job-embeddings.service';
import { EmbeddingsWrapper } from '@apps/api/src/app/ai/providers/embedding.types';
import { MemorySaver } from '@langchain/langgraph';

interface OllamaAgentGraphContext {
  graph: Awaited<ReturnType<InstanceType<typeof LanggraphService>['build']>>;
  prepareJobs: (jobs: Job[]) => Promise<void>;
  cleanup: () => Promise<void>;
}

export interface OllamaAgentRuntimeContext extends OllamaAgentGraphContext {
  cvEmbeddingsService: CvEmbeddingsService;
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
    const cvEmbeddingsService = new CvEmbeddingsService(
      llm as any,
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
    const langgraphService = new LanggraphService(
      llm as any,
      llm as any,
      llm as any,
      cvEmbeddingsService,
      jobEmbeddingsService,
      checkpointer as any,
    );

    return {
      graph: await langgraphService.build(),
      cvEmbeddingsService,
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
  return runtime.cvEmbeddingsService.ensureCvAndEmbeddings(cvText);
}
