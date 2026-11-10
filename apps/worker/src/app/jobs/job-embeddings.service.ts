import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { Job, JobEmbedding } from '@apps/shared';
import { EMBEDDING_MODEL } from '../ai/ai.constants';
import type { EmbeddingsWrapper } from '../ai/providers/embedding.types';
import { CvEmbeddingsService } from '../cv/embeddings/cv-summary-embeddings.service';
import type { WeightedEmbedding } from '../cv/embeddings/types';

type JobDescription = Pick<Job, 'url' | 'description'>;

@Injectable()
export class JobEmbeddingsService {
  constructor(
    @InjectRepository(JobEmbedding)
    private readonly jobEmbeddingsRepository: Repository<JobEmbedding>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    private readonly cvEmbeddingsService: CvEmbeddingsService,
    @Inject(EMBEDDING_MODEL)
    private readonly embeddingModel: EmbeddingsWrapper,
  ) {}

  async getJobEmbeddings(job: JobDescription): Promise<WeightedEmbedding[]> {
    const rows = await this.jobEmbeddingsRepository.find({
      select: { embedding: true },
      where: {
        job: { url: job.url },
        contentHash: this.contentHash(job.description),
        model: this.embeddingModel.modelName,
      },
      order: { chunkIndex: 'ASC' },
    });

    return rows.map(({ embedding }) => ({
      embedding,
      weight: 1,
    }));
  }

  async ensureJobEmbeddings(job: JobDescription): Promise<void> {
    const existing = await this.getJobEmbeddings(job);
    if (existing.length > 0) {
      return;
    }

    const persistedJob = await this.jobRepository.findOneByOrFail({
      url: job.url,
    });
    const embeddings =
      await this.cvEmbeddingsService.createEmbeddingsForJobDescription(
        job.description,
      );
    if (embeddings.length === 0) {
      return;
    }

    const contentHash = this.contentHash(job.description);
    await this.jobEmbeddingsRepository.upsert(
      embeddings.map(({ embedding }, chunkIndex) => ({
        jobId: persistedJob.id,
        contentHash,
        model: this.embeddingModel.modelName,
        chunkIndex,
        embedding,
      })),
      { conflictPaths: ['jobId', 'contentHash', 'model', 'chunkIndex'] },
    );
  }

  private contentHash(description: string): string {
    return createHash('sha256').update(description).digest('hex');
  }
}
