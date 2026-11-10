import { Inject, Injectable } from '@nestjs/common';
import type { CvSchema } from '../cv-schema';
import { HumanMessage } from '@langchain/core/messages';
import { countTokensApproximately } from 'langchain';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { stripHtml } from 'string-strip-html';
import { EMBEDDING_MODEL } from '../../ai/ai.constants';
import type { EmbeddingsWrapper } from '../../ai/providers/embedding.types';
import sectionWeights from './cv-section-weights';
import { CvEmbeddingsRepository } from './cv-embeddings.repository';
import { EntityManager } from 'typeorm';
import { Cv } from '@apps/shared';
import { DataSource } from 'typeorm';
import { WeightedEmbedding, SqlExecutor } from './types';
import { createLogger } from '@apps/shared';
import type { z } from 'zod';
import { CvService } from '../cv.service';

interface CvEmbeddingResult {
  parsedCv: z.infer<typeof CvSchema>;
  embeddings: WeightedEmbedding[];
}

@Injectable()
export class CvEmbeddingsService {
  private readonly logger = createLogger(CvEmbeddingsService.name);

  constructor(
    private readonly cvService: CvService,
    @Inject(EMBEDDING_MODEL)
    private readonly embeddingModel: EmbeddingsWrapper,
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
  ): Promise<CvEmbeddingResult> {
    const parsedCv = await this.cvService.parseCv(cvText);
    return {
      parsedCv,
      embeddings: await this.createWeightedEmbeddings(parsedCv, cvText),
    };
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
          ...(await this.embedKeyValueWithWeights(key, formattedValue)),
        );
      } else {
        const trimmedValue = value?.trim();
        if (!trimmedValue || trimmedValue.length === 0) {
          continue;
        }
        embeddingsWithWeight.push(
          ...(await this.embedKeyValueWithWeights(key, trimmedValue)),
        );
      }
    }
    return embeddingsWithWeight;
  }

  private async embedKeyValueWithWeights(
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
    const weightedEmbeddings: WeightedEmbedding[] = [];

    const normalizedChunks = [];

    for (const chunk of chunks) {
      const normalizedChunk = normalizeChunk(chunk).trim();
      if (!normalizedChunk) {
        continue;
      }
      normalizedChunks.push(normalizedChunk);
    }

    if (normalizedChunks.length === 0) {
      return [];
    }

    const embeddings = await this.createEmbeddingsBulk(normalizedChunks);
    for (const embedding of embeddings) {
      weightedEmbeddings.push({
        embedding,
        weight: weight ?? 1,
      });
    }

    return weightedEmbeddings;
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
    this.logger.info(
      {
        tokenCount,
        jobDescription: jobDescription.substring(0, 100) + '...',
      },
      'Token count for job',
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

  async createEmbeddingsBulk(texts: string[]): Promise<number[][]> {
    const vectors = await this.embeddingModel.embedDocuments(texts);
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
    modelName: string = this.embeddingModel.modelName,
  ): Promise<number> {
    return this.cvEmbeddingsRepository.getJobAndCvMatchingScore(
      cvId,
      queryEmbeddings,
      modelName,
      this.dataSource,
    );
  }

  private async ensureCvEmbeddings(
    manager: EntityManager,
    cvEntity: Cv,
    modelName: string = this.embeddingModel.modelName,
  ): Promise<void> {
    const existingEmbeddings =
      await this.cvEmbeddingsRepository.fetchCvEmbeddings(
        cvEntity.id,
        manager,
        modelName,
      );

    if (existingEmbeddings.length > 0) {
      return;
    }

    const { embeddings: cvEmbedding, parsedCv } =
      await this.createWeightedEmbeddingsForCv(cvEntity.rawText);

    await manager.update(Cv, cvEntity.id, parsedCv);

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
    modelName: string = this.embeddingModel.modelName,
  ): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const cvEntity = await this.cvService.ensureCvEntity(manager, cvText);
      await this.ensureCvEmbeddings(manager, cvEntity, modelName);
      return cvEntity.id;
    });
  }
}
