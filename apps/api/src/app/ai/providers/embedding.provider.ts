import { EMBEDDING_MODEL } from '../ai.constants';
import { env } from '../../../utils/env';
import { OllamaEmbeddings } from '@langchain/ollama';
import { CohereEmbeddings } from '@langchain/cohere';
import { EmbeddingsWrapper } from './embedding.types';
import { createLogger } from '@apps/shared';

const logger = createLogger('EmbeddingProvider');

function embeddingModelCohere(): EmbeddingsWrapper {
  const apiKey = env.COHERE_API_KEY;
  if (!apiKey) {
    logger.warn('Cohere API key is not set, falling back to Ollama embeddings');
    return embeddingModelOllama();
  }

  const embeddingModel = new CohereEmbeddings({
    model: env.COHERE_EMBEDDING_MODEL,
    apiKey,
  }) as unknown as EmbeddingsWrapper;

  embeddingModel.modelName = env.COHERE_EMBEDDING_MODEL;

  return embeddingModel;
}

function embeddingModelOllama(): EmbeddingsWrapper {
  const embeddingModel = new OllamaEmbeddings({
    model: env.OLLAMA_EMBEDDING_MODEL,
    // this always has to be local because there is no embedding model on cloud
    baseUrl: env.OLLAMA_EMBEDDING_BASE_URL ?? env.OLLAMA_BASE_URL,
  }) as unknown as EmbeddingsWrapper;

  embeddingModel.modelName = env.OLLAMA_EMBEDDING_MODEL;

  return embeddingModel;
}

export const embeddingModelProvider = {
  provide: EMBEDDING_MODEL,
  useFactory: () => {
    if (env.NODE_ENV === 'production') {
      return embeddingModelCohere();
    }
    return embeddingModelOllama();
  },
};
