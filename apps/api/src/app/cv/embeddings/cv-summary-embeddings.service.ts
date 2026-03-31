import { Injectable } from '@nestjs/common';
import { PromptTemplate } from '@langchain/core/prompts';
import { CvSchema } from './cv-schema';
import { RunnableSequence } from '@langchain/core/runnables';
import { OllamaEmbeddings } from '@langchain/ollama';
import { env } from '../../../utils/env';
import { Pool } from 'pg';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { countTokensApproximately, HumanMessage } from 'langchain';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { stripHtml } from 'string-strip-html';

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
export class CvEmbeddingsService {
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
      2. **Do not invent facts, dates, companies, or skills**. If uncertain, use 'null' or empty strings.
      3. **Classify each block into ONE section type** from the schema below.
      4. **Always return valid JSON** matching the schema exactly - no extra fields, no missing fields.
      5. **Keep 'raw_text' identical** to the input block (including formatting, bullets, typos).

      ## Input Block
      {cvText}
    `);

    const llm = new ChatGoogleGenerativeAI({
      apiKey: env.GEMINI_API_KEY,
      model: env.CV_PARSER_MODEL,
    }).withStructuredOutput(CvSchema);

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
      const embedding = await this.createEmbeddings(cvText);
      return [{ embedding, weight: 1 }];
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
          await this.embedKeyValue(key, formattedValue),
        );
      } else {
        const trimmedValue = value?.trim();
        if (!trimmedValue || trimmedValue.length === 0) {
          continue;
        }
        embeddingsWithWeight.push(await this.embedKeyValue(key, trimmedValue));
      }
    }
    return embeddingsWithWeight;
  }

  private async embedKeyValue(key: string, value: string) {
    const sectionWeights: Record<string, number> = {
      summary: 0.6,
      skills: 2.5,
      experience: 3.0,
      projects: 1.8,
      education: 0.7,
      other: 0.2,
    };
    const textToEmbed = key + ': ' + value;
    const embedding = await this.createEmbeddings(textToEmbed);
    return {
      embedding,
      weight: sectionWeights[key] ?? 1.0,
    };
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
      const embeddings: number[][] = [];
      for (const doc of htmlDocs) {
        const cleanText = stripHtml(doc).result;
        const embedding = await this.createEmbeddings(cleanText);
        embeddings.push(embedding);
      }
      return embeddings;
    } else {
      const embedding = await this.createEmbeddings(
        stripHtml(jobDescription).result,
      );
      return [embedding];
    }
  }

  async createEmbeddings(text: string) {
    const embeddingModel = new OllamaEmbeddings({
      model: env.EMBEDDING_MODEL,
      baseUrl: env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    });

    try {
      const vectors = await embeddingModel.embedQuery(text);
      return vectors;
    } catch (error) {
      throw error;
    }
  }

  private toVectorLiteral(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }

  async insertCvEmbeddings(embeddings: CvEmbeddingRecord[]): Promise<void> {
    if (embeddings.length === 0 || !this.pool) {
      return;
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

    await this.pool.query(
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
