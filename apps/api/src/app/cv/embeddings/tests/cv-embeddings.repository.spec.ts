import { CvEmbeddingsRepository } from '../cv-embeddings.repository';
import type { Pool } from 'pg';

describe('CvEmbeddingsRepository', () => {
  it('weights query embedding scores when calculating the final match score', async () => {
    const repository = new CvEmbeddingsRepository();
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ score: 0.8 }] })
      .mockResolvedValueOnce({ rows: [{ score: 0.4 }] });

    const pool = { query } as unknown as Pool;

    const score = await repository.getJobAndCvMatchingScore(
      42,
      [
        { embedding: [1, 2, 3], weight: 2 },
        { embedding: [4, 5, 6], weight: 1 },
      ],
      'test-model',
      pool,
    );

    expect(score).toBeCloseTo((0.8 * 2 + 0.4 * 1) / 3, 10);
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM "cv_embedding" ce'),
      [42, '[1,2,3]', 'test-model'],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM "cv_embedding" ce'),
      [42, '[4,5,6]', 'test-model'],
    );
  });
});
