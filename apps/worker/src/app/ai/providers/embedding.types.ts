import type { Embeddings } from '@langchain/core/embeddings';

export interface EmbeddingsWrapper
  extends Pick<Embeddings, 'embedDocuments' | 'embedQuery'> {
  modelName: string;
}
