import { Injectable } from '@nestjs/common';
import { PromptTemplate } from '@langchain/core/prompts';
import { CvSchema } from './cv-schema';
import { RunnableSequence } from '@langchain/core/runnables';
import { env } from '../../../utils/env';
import { Pool } from 'pg';
import { HumanMessage } from '@langchain/core/messages';
import { countTokensApproximately } from 'langchain';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { stripHtml } from 'string-strip-html';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { CV_PARSER_LLM, EMBEDDING_MODEL } from '../../ai/ai.constants';
import { Inject } from '@nestjs/common';
import { Embeddings } from '@langchain/core/embeddings';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';

interface CvWeightedEmbedding {
  embedding: number[];
  weight: number;
}

interface CvEmbeddingRecord {
  cvId: number;
  embedding: number[];
  weight: number;
  model: string;
  createdAt?: Date;
}

@Injectable()
export class CvEmbeddingsService implements OnModuleInit, OnApplicationShutdown {
  private pool: Pool | undefined;

  async onModuleInit(): Promise<void> {
    this.pool = new Pool({
      connectionString: `postgres://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`,
    });
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }

  constructor(
    @Inject(CV_PARSER_LLM)
    private readonly cvParserLlm: BaseChatModel,
    @Inject(EMBEDDING_MODEL)
    private readonly embeddingModel: Embeddings,
  ) {}

  private isEmpty(obj: Record<string, string | string[]>) {
    return Object.values(obj).every((value) => {
      if (Array.isArray(value)) {
        return value.every((item) => !item || item.trim().length === 0);
      }
      return !value || value.trim().length === 0;
    });
  }

  async createWeightedEmbeddingsForCv(
    cvText: string,
  ): Promise<CvWeightedEmbedding[]> {
    const template = PromptTemplate.fromTemplate(`
      **You are a precise CV parser. Your job is to analyze raw CV text blocks and map them to a strict JSON schema.**

      ## Instructions

      1. **NEVER rewrite, summarize, or improve the candidate's text**. Preserve exact original wording.
      2. **Do not invent facts, dates, companies, or skills**. If a value is unknown, omit optional string fields and use empty arrays for list fields.
      3. **Classify each block into ONE section type** from the schema below.
      4. **Always return valid JSON** matching the schema exactly - no extra fields, no missing fields.
      5. **Use only the exact field names and value types defined in CvSchema**: 'summary' as an optional string, 'skills' as a string array, 'experience' as a string array, 'projects' as a string array, 'education' as a string array, and 'other' as an optional string array.
      6. **Preserve the candidate's original wording in the extracted text values**. Do not add a 'raw_text' field.

      ## Input Block
      {cvText}
    `);

    const llm = this.cvParserLlm.withStructuredOutput(CvSchema);

    const chain = RunnableSequence.from([
      template,
      llm,
      async (input) => {
        return this.createWeightedEmbeddings(input, cvText);
      },
    ]);

    const response = await chain.invoke({ cvText });

    return response;
  }

  async createWeightedEmbeddings(
    documents: Record<string, string | string[]>,
    cvText: string,
  ): Promise<CvWeightedEmbedding[]> {
    if (this.isEmpty(documents)) {
      return this.createEmbeddingsForWeightedChunks(cvText, 1);
    }
    const embeddingsWithWeight: CvWeightedEmbedding[] = [];
    for (const [key, value] of Object.entries(documents)) {
      if (Array.isArray(value)) {
        const nonEmptyItems = value
          .map((item) => item?.trim())
          .filter((item) => item && item.length > 0);
        if (nonEmptyItems.length === 0) {
          continue;
        }
        const formattedValue = nonEmptyItems.join('\n');
        embeddingsWithWeight.push(
          ...(await this.embedKeyValue(key, formattedValue)),
        );
      } else {
        const trimmedValue = value?.trim();
        if (!trimmedValue || trimmedValue.length === 0) {
          continue;
        }
        embeddingsWithWeight.push(
          ...(await this.embedKeyValue(key, trimmedValue)),
        );
      }
    }
    return embeddingsWithWeight;
  }

  private async embedKeyValue(
    key: string,
    value: string,
  ): Promise<CvWeightedEmbedding[]> {
    const sectionWeights: Record<string, number> = {
      summary: 0.6,
      skills: 2.5,
      experience: 3.0,
      projects: 1.8,
      education: 0.7,
      other: 0.2,
    };
    const weight = sectionWeights[key] ?? 1.0;
    return this.createEmbeddingsForWeightedChunks(`${key}: ${value}`, weight);
  }

  private async createEmbeddingsForWeightedChunks(
    text: string,
    weight: number,
  ): Promise<CvWeightedEmbedding[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 60,
    });
    const chunks = await splitter.splitText(text);
    return this.createEmbeddingsForChunks(chunks, (chunk) => chunk.trim(), weight);
  }

  private async createEmbeddingsForChunks(
    chunks: string[],
    normalizeChunk: (chunk: string) => string,
    weight: number,
  ): Promise<CvWeightedEmbedding[]>;

  private async createEmbeddingsForChunks(
    chunks: string[],
    normalizeChunk: (chunk: string) => string,
  ): Promise<number[][]>;

  private async createEmbeddingsForChunks(
    chunks: string[],
    normalizeChunk: (chunk: string) => string,
    weight?: number,
  ): Promise<CvWeightedEmbedding[] | number[][]> {
    const embeddings: CvWeightedEmbedding[] = [];

    for (const chunk of chunks) {
      const normalizedChunk = normalizeChunk(chunk).trim();
      if (!normalizedChunk) {
        continue;
      }

      const embedding = await this.createEmbeddings(normalizedChunk);
      embeddings.push({
        embedding,
        weight: weight ?? 1,
      });
    }

    if (weight === undefined) {
      return embeddings.map((item) => item.embedding);
    }

    return embeddings;
  }

  /**
   * Job descriptions can be very long and we cannot embed the whole text as there are small limits for embeddings
   * and also it's not accurate. Therefore we need to split it first. Since there is no fixed structure,
   * the best to do here is to split by length.
   */
  async createEmbeddingsForJobDescription(
    jobDescription: string,
  ): Promise<number[][]> {
    const tokenCount = countTokensApproximately([
      new HumanMessage(jobDescription),
    ]);
    console.log(
      'Token count for job description: ',
      jobDescription,
      tokenCount,
    );

    if (tokenCount > 500) {
      const htmlSplitter = RecursiveCharacterTextSplitter.fromLanguage('html', {
        chunkSize: 500,
        chunkOverlap: 60,
      });
      const htmlDocs = await htmlSplitter.splitText(jobDescription);
      return this.createEmbeddingsForChunks(htmlDocs, (doc) => stripHtml(doc).result);
    }

    return this.createEmbeddingsForChunks([jobDescription], (doc) => stripHtml(doc).result);
  }

  async createEmbeddings(text: string) {
    try {
      const vectors = await this.embeddingModel.embedQuery(text);
      return vectors;
    } catch (error) {
      throw error;
    }
  }

  private toVectorLiteral(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }

  async insertCvEmbeddings(
    embeddings: CvEmbeddingRecord[],
    manager: any = this.pool,
  ): Promise<void> {
    if (embeddings.length === 0) {
      return;
    }

    const executor = manager || this.pool;

    if (!executor) {
      throw new Error('Embeddings pool not initialized');
    }

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

    await executor.query(
      `
        INSERT INTO "cv_embedding" ("cvId", "embedding", "weight", "model", "createdAt")
        VALUES ${placeholders.join(', ')}
      `,
      values,
    );
  }

  async scoreJobAndCvMatching(
    cvId: number,
    queryEmbeddings: number[][],
    model = env.EMBEDDING_MODEL,
  ): Promise<number> {
    if (!this.pool) {
      throw new Error('Pool is not initialized');
    }

    let totalScore = 0;

    for (const queryEmbedding of queryEmbeddings) {
      const result = await this.pool.query<{ score: number | null }>(
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
        [cvId, this.toVectorLiteral(queryEmbedding), model],
      );

      totalScore += result.rows[0]?.score ?? 0;
    }

    return totalScore / queryEmbeddings.length;
  }
}
