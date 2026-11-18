import { OpenAIEmbeddings } from '@langchain/openai';
import { EMBEDDING_MODEL } from '../ai.constants';
import { env } from '../../../utils/env';
import type { EmbeddingsWrapper } from './embedding.types';

export const embeddingModelProvider = {
  provide: EMBEDDING_MODEL,
  useFactory: (): EmbeddingsWrapper => {
    const provider = env.EMBEDDING_PROVIDER;
    if (provider === 'ai_gateway') {
      if (!env.AI_GATEWAY_API_KEY || !env.AI_GATEWAY_EMBEDDING_MODEL) {
        throw new Error(
          'Missing AI Gateway embedding configuration. Set AI_GATEWAY_API_KEY and AI_GATEWAY_EMBEDDING_MODEL before starting the worker.',
        );
      }

      return new OpenAIEmbeddings({
        model: env.AI_GATEWAY_EMBEDDING_MODEL,
        apiKey: env.AI_GATEWAY_API_KEY,
        configuration: { baseURL: 'https://ai-gateway.vercel.sh/v1' },
        stripNewLines: false,
        encodingFormat: 'float',
      });
    }

    const baseURL = env.OLLAMA_EMBEDDING_BASE_URL ?? env.OLLAMA_BASE_URL;

    return new OpenAIEmbeddings({
      model: env.OLLAMA_EMBEDDING_MODEL,
      apiKey: 'ollama',
      configuration: { baseURL: baseURL || 'http://127.0.0.1:11434/v1' },
      stripNewLines: false,
      encodingFormat: 'float',
    });
  },
};
