import { ChatOllama } from '@langchain/ollama';
import { LanggraphService } from '@apps/api/src/app/ai/langgraph/langgraph.service';
import { OllamaEmbeddings } from '@langchain/ollama';
import { env } from './env';
import { CvEmbeddingsService } from '@apps/api/src/app/cv/embeddings/cv-summary-embeddings.service';
import { CvEmbeddingsRepository } from '@apps/api/src/app/cv/embeddings/cv-embeddings.repository';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '@apps/shared';

interface OllamaAgentGraphContext {
  graph: ReturnType<InstanceType<typeof LanggraphService>['build']>;
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
  });

  const cvEmbeddingsRepository = new CvEmbeddingsRepository();
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  try {
    const cvEmbeddingsService = new CvEmbeddingsService(
      llm as any,
      embeddingModel as any,
      cvEmbeddingsRepository as any,
      dataSource,
    );

    return {
      graph: new LanggraphService(
        llm as any,
        llm as any,
        llm as any,
        cvEmbeddingsService,
      ).build(),
      cvEmbeddingsService,
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
    cleanup: runtime.cleanup,
  };
}

export async function seedCvEmbeddingsForRuntime(
  runtime: OllamaAgentRuntimeContext,
  cvText: string,
): Promise<number> {
  return runtime.cvEmbeddingsService.ensureCvAndEmbeddings(cvText);
}
