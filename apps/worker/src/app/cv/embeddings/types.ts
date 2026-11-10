export interface WeightedEmbedding {
  embedding: number[];
  weight: number;
}

export interface CvEmbeddingRecord {
  cvId: number;
  embedding: number[];
  weight: number;
  model: string;
  createdAt?: Date;
}

export interface SqlExecutor {
  query: <T = any>(...args: any[]) => Promise<T>;
}
