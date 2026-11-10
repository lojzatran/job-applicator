import { Repository } from 'typeorm';
import { Job, JobEmbedding } from '@apps/shared';
import { JobEmbeddingsService } from './job-embeddings.service';
import { CvEmbeddingsService } from '../cv/embeddings/cv-summary-embeddings.service';
import type { EmbeddingsWrapper } from '../ai/providers/embedding.types';

describe('JobEmbeddingsService', () => {
  const job = {
    url: 'https://example.com/job/1',
    description: 'TypeScript developer',
  };
  let find: jest.Mock;
  let upsert: jest.Mock;
  let createEmbeddings: jest.Mock;
  let service: JobEmbeddingsService;

  beforeEach(() => {
    find = jest.fn().mockResolvedValue([]);
    upsert = jest.fn().mockResolvedValue({});
    createEmbeddings = jest.fn().mockResolvedValue([
      { embedding: [0.1, 0.2], weight: 1 },
      { embedding: [0.3, 0.4], weight: 1 },
    ]);
    service = new JobEmbeddingsService(
      { find, upsert } as unknown as Repository<JobEmbedding>,
      {
        findOneByOrFail: jest.fn().mockResolvedValue({ id: 1 }),
      } as unknown as Repository<Job>,
      {
        createEmbeddingsForJobDescription: createEmbeddings,
      } as unknown as CvEmbeddingsService,
      { modelName: 'model-a' } as EmbeddingsWrapper,
    );
  });

  it('should reuse cached embeddings without calling the model', async () => {
    find.mockResolvedValueOnce([{ embedding: [0.1, 0.2] }]);

    await service.ensureJobEmbeddings(job);

    expect(createEmbeddings).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('should prepare all description chunks when no cached embeddings exist', async () => {
    await service.ensureJobEmbeddings(job);

    expect(createEmbeddings).toHaveBeenCalledWith(job.description);
    expect(upsert).toHaveBeenCalledWith(
      [
        {
          jobId: 1,
          contentHash: expect.any(String),
          model: 'model-a',
          chunkIndex: 0,
          embedding: [0.1, 0.2],
        },
        {
          jobId: 1,
          contentHash: expect.any(String),
          model: 'model-a',
          chunkIndex: 1,
          embedding: [0.3, 0.4],
        },
      ],
      expect.any(Object),
    );
  });

  it('should read vectors with the weights used by the existing matching score', async () => {
    find.mockResolvedValueOnce([
      { embedding: [0.1, 0.2] },
      { embedding: [0.3, 0.4] },
    ]);

    await expect(service.getJobEmbeddings(job)).resolves.toEqual([
      { embedding: [0.1, 0.2], weight: 1 },
      { embedding: [0.3, 0.4], weight: 1 },
    ]);
    expect(createEmbeddings).not.toHaveBeenCalled();
  });

  it('should not cache a failed model call so preparation can be retried', async () => {
    createEmbeddings.mockRejectedValueOnce(new Error('Model unavailable'));

    await expect(service.ensureJobEmbeddings(job)).rejects.toThrow(
      'Model unavailable',
    );
    expect(upsert).not.toHaveBeenCalled();

    await service.ensureJobEmbeddings(job);
    expect(createEmbeddings).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('should not insert empty embedding sets', async () => {
    createEmbeddings.mockResolvedValueOnce([]);

    await service.ensureJobEmbeddings(job);

    expect(upsert).not.toHaveBeenCalled();
  });
});
