import { Inject, Injectable } from '@nestjs/common';
import { PromptTemplate } from '@langchain/core/prompts';
import { CvSchema } from './cv-schema';
import { RunnableSequence } from '@langchain/core/runnables';
import { HumanMessage } from '@langchain/core/messages';
import { countTokensApproximately } from 'langchain';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { stripHtml } from 'string-strip-html';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { CV_PARSER_LLM, EMBEDDING_MODEL } from '../../ai/ai.constants';
import { Embeddings } from '@langchain/core/embeddings';
import sectionWeights from './cv-section-weights';
import { CvEmbeddingsRepository } from './cv-embeddings.repository';
import { env } from '../../../utils/env';
import { EntityManager } from 'typeorm';
import { Cv } from '@apps/shared';
import * as crypto from 'crypto';
import { DataSource } from 'typeorm';
import { WeightedEmbedding, SqlExecutor } from './types';

@Injectable()
export class CvEmbeddingsService {
  constructor(
    @Inject(CV_PARSER_LLM)
    private readonly cvParserLlm: BaseChatModel,
    @Inject(EMBEDDING_MODEL)
    private readonly embeddingModel: Embeddings,
    private readonly cvEmbeddingsRepository: CvEmbeddingsRepository,
    private readonly dataSource: DataSource,
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
  ): Promise<WeightedEmbedding[]> {
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

  private async createWeightedEmbeddings(
    documents: Record<string, string | string[]>,
    cvText: string,
  ): Promise<WeightedEmbedding[]> {
    if (this.isEmpty(documents)) {
      return this.createEmbeddingsForWeightedChunks(cvText, 1);
    }
    const embeddingsWithWeight: WeightedEmbedding[] = [];
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
  ): Promise<WeightedEmbedding[]> {
    const weight = sectionWeights[key] ?? 1.0;
    return this.createEmbeddingsForWeightedChunks(`${key}: ${value}`, weight);
  }

  private async createEmbeddingsForWeightedChunks(
    text: string,
    weight: number,
  ): Promise<WeightedEmbedding[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 60,
    });
    const chunks = await splitter.splitText(text);
    return this.createEmbeddingsForChunks(
      chunks,
      (chunk) => chunk.trim(),
      weight,
    );
  }

  private async createEmbeddingsForChunks(
    chunks: string[],
    normalizeChunk: (chunk: string) => string,
    weight: number,
  ): Promise<WeightedEmbedding[]> {
    const embeddings: WeightedEmbedding[] = [];

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

    return embeddings;
  }

  /**
   * Job descriptions can be very long and we cannot embed the whole text as there are small limits for embeddings
   * and also it's not accurate. Therefore we need to split it first. Since there is no fixed structure,
   * the best to do here is to split by length.
   */
  async createEmbeddingsForJobDescription(
    jobDescription: string,
  ): Promise<WeightedEmbedding[]> {
    const tokenCount = countTokensApproximately([
      new HumanMessage(jobDescription),
    ]);
    console.log(
      'Token count for job description: ',
      jobDescription.substring(0, 100) + '...',
      tokenCount,
    );

    if (tokenCount > 500) {
      const htmlSplitter = RecursiveCharacterTextSplitter.fromLanguage('html', {
        chunkSize: 500,
        chunkOverlap: 60,
      });
      const htmlDocs = await htmlSplitter.splitText(jobDescription);
      return this.createEmbeddingsForChunks(
        htmlDocs,
        (doc) => stripHtml(doc).result,
        1,
      );
    }

    return this.createEmbeddingsForChunks(
      [jobDescription],
      (doc) => stripHtml(doc).result,
      1,
    );
  }

  private async createEmbeddings(text: string): Promise<number[]> {
    const vectors = await this.embeddingModel.embedQuery(text);
    return vectors;
  }

  async insertCvEmbeddings(
    embeddings: {
      cvId: number;
      embedding: number[];
      weight: number;
      model: string;
      createdAt?: Date;
    }[],
    manager: SqlExecutor,
  ): Promise<void> {
    if (embeddings.length === 0) {
      return;
    }
    await this.cvEmbeddingsRepository.insertCvEmbeddings(embeddings, manager);
  }

  async getJobAndCvMatchingScore(
    cvId: number,
    queryEmbeddings: WeightedEmbedding[],
    modelName: string = env.EMBEDDING_MODEL,
  ): Promise<number> {
    return this.cvEmbeddingsRepository.getJobAndCvMatchingScore(
      cvId,
      queryEmbeddings,
      modelName,
      this.dataSource,
    );
  }

  private async ensureCvEntity(
    manager: EntityManager,
    cvText: string,
  ): Promise<{ cvEntity: Cv; isNew: boolean }> {
    const cvHash = crypto.createHash('md5').update(cvText).digest('hex');
    const cvRepository = manager.getRepository(Cv);
    const cvEntity = await cvRepository.findOne({
      where: { hash: cvHash },
    });

    if (!cvEntity) {
      const insertResult = await cvRepository
        .createQueryBuilder()
        .insert()
        .into(Cv)
        .values({
          path: 'temp',
          rawText: cvText,
          hash: cvHash,
          createdAt: new Date(),
        })
        .orIgnore()
        .execute();

      const isNew =
        insertResult.identifiers.length > 0 ||
        (Array.isArray(insertResult.raw) && insertResult.raw.length > 0);

      const persistedCvEntity = await cvRepository.findOne({
        where: { hash: cvHash },
      });

      if (!persistedCvEntity) {
        throw new Error(
          `Failed to persist or reload CV row for hash ${cvHash}`,
        );
      }

      return { cvEntity: persistedCvEntity, isNew };
    } else {
      return { cvEntity, isNew: false };
    }
  }

  private async ensureCvEmbeddings(
    manager: EntityManager,
    cvEntity: Cv,
    modelName: string = env.EMBEDDING_MODEL,
  ): Promise<void> {
    const existingEmbeddings =
      await this.cvEmbeddingsRepository.fetchCvEmbeddings(cvEntity.id, manager);

    if (existingEmbeddings.length > 0) {
      return;
    }

    const cvEmbedding: {
      embedding: number[];
      weight: number;
    }[] = await this.createWeightedEmbeddingsForCv(cvEntity.rawText);

    const embeddings = cvEmbedding.map((embedding) => {
      return {
        cvId: cvEntity.id,
        embedding: embedding.embedding,
        weight: embedding.weight,
        model: modelName,
        createdAt: new Date(),
      };
    });

    await this.cvEmbeddingsRepository.insertCvEmbeddings(embeddings, manager);
  }

  async ensureCvAndEmbeddings(
    cvText: string,
    modelName: string = env.EMBEDDING_MODEL,
  ): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const { cvEntity, isNew } = await this.ensureCvEntity(manager, cvText);
      if (isNew) {
        await this.ensureCvEmbeddings(manager, cvEntity, modelName);
      }
      return cvEntity.id;
    });
  }
}
