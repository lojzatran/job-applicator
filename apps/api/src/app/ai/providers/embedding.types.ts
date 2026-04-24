import { Embeddings } from '@langchain/core/embeddings';

export interface EmbeddingsWrapper extends Embeddings {
  modelName: string;
}
