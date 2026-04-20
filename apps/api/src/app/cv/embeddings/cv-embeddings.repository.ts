import { Injectable } from '@nestjs/common';
import { env } from '../../../utils/env';
import { CvEmbeddingRecord, SqlExecutor, WeightedEmbedding } from './types';

@Injectable()
export class CvEmbeddingsRepository {
  async insertCvEmbeddings(
    embeddings: CvEmbeddingRecord[],
    manager: SqlExecutor,
  ): Promise<void> {
    const placeholders: string[] = [];

    const values = embeddings.flatMap((embedding, index) => {
      const offset = index * 5;
      placeholders.push(
        `($${offset + 1}::integer, $${offset + 2}::vector, $${offset + 3}::float, $${offset + 4}::varchar, $${offset + 5}::timestamp)`,
      );
      return [
        embedding.cvId,
        this.toVectorLiteral(embedding.embedding),
        embedding.weight,
        embedding.model,
        embedding.createdAt ?? new Date(),
      ];
    });

    await manager.query(
      `
        INSERT INTO "cv_embedding" ("cvId", "embedding", "weight", "model", "createdAt")
        VALUES ${placeholders.join(', ')}
      `,
      values,
    );
  }

  async getJobAndCvMatchingScore(
    cvId: number,
    queryEmbeddings: WeightedEmbedding[],
    modelName: string = env.EMBEDDING_MODEL,
    manager: SqlExecutor,
  ): Promise<number> {
    let totalScore = 0;
    let totalWeight = 0;

    for (const queryEmbedding of queryEmbeddings) {
      const result = await manager.query(
        `
          SELECT AVG(weighted."score")::float8 AS "score"
          FROM (
            SELECT ce."weight" * (1 - (ce."embedding" <=> $2::vector)) AS "score"
            FROM "cv_embedding" ce
            WHERE ce."cvId" = $1
              AND ce."model" = $3
            ORDER BY (1 - (ce."embedding" <=> $2::vector)) DESC
          LIMIT 3
        ) weighted
        `,
        [cvId, this.toVectorLiteral(queryEmbedding.embedding), modelName],
      );

      const rows = Array.isArray(result) ? result : result.rows;
      const score = rows[0]?.score ?? 0;
      const weight = queryEmbedding.weight ?? 1;

      totalScore += score * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return 0;
    }

    return totalScore / totalWeight;
  }

  private toVectorLiteral(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }

  async fetchCvEmbeddings(
    cvId: number,
    manager: SqlExecutor,
    modelName: string = env.EMBEDDING_MODEL,
  ): Promise<{ id: number }[]> {
    return await manager.query<{ id: number }[]>(
      `
            SELECT "id"
            FROM "cv_embedding"
            WHERE "cvId" = $1
              AND "model" = $2
            LIMIT 1
          `,
      [cvId, modelName],
    );
  }
}
