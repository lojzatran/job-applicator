import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import type { DataSource, EntityManager } from 'typeorm';
import { CvEmbeddingsService } from '../cv-summary-embeddings.service';
import type { CvEmbeddingsRepository } from '../cv-embeddings.repository';

describe('CvEmbeddingsService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Job description embedding hygiene', () => {
    it('returns no embeddings for empty or whitespace-only job descriptions', async () => {
      const service = createService();
      const createEmbeddingsSpy = jest.spyOn(service, 'createEmbeddings');

      await expect(
        service.createEmbeddingsForJobDescription('   \n\t  '),
      ).resolves.toEqual([]);

      expect(createEmbeddingsSpy).not.toHaveBeenCalled();
    });

    it('skips blank split chunks before embedding job descriptions', async () => {
      const service = createService();
      const createEmbeddingsSpy = jest
        .spyOn(service, 'createEmbeddings')
        .mockResolvedValue([1, 2, 3]);
      const splitterSpy = jest.spyOn(
        RecursiveCharacterTextSplitter,
        'fromLanguage',
      );

      splitterSpy.mockReturnValue({
        splitText: jest
          .fn()
          .mockResolvedValue([
            '   ',
            '<p>Product manager with strong ops background</p>',
            '<div>\n</div>',
          ]),
      } as never);

      const jobDescription = `<div>${'role '.repeat(800)}</div>`;
      const embeddings =
        await service.createEmbeddingsForJobDescription(jobDescription);

      expect(embeddings).toEqual([
        {
          embedding: [1, 2, 3],
          weight: 1,
        },
      ]);
      expect(createEmbeddingsSpy).toHaveBeenCalledTimes(1);
      expect(createEmbeddingsSpy).toHaveBeenCalledWith(
        'Product manager with strong ops background',
      );
    });
  });
});

function createService(
  cvEmbeddingsRepository = createRepository() as unknown as CvEmbeddingsRepository,
): CvEmbeddingsService {
  const cvParserLlm = {
    withStructuredOutput: jest.fn(),
  } as unknown as BaseChatModel;
  const embeddingModel = {
    embedQuery: jest.fn(),
  } as unknown as Embeddings;
  const dataSource = createDataSource();

  return new CvEmbeddingsService(
    cvParserLlm,
    embeddingModel,
    cvEmbeddingsRepository,
    dataSource,
  );
}

function createDataSource(): DataSource {
  return {
    transaction: jest.fn(
      async (callback: (manager: EntityManager) => Promise<unknown>) => {
        return callback({} as EntityManager);
      },
    ),
  } as unknown as DataSource;
}

function createRepository(): jest.Mocked<
  Pick<
    CvEmbeddingsRepository,
    'insertCvEmbeddings' | 'getJobAndCvMatchingScore'
  >
> {
  return {
    insertCvEmbeddings: jest.fn().mockResolvedValue(undefined),
    getJobAndCvMatchingScore: jest.fn().mockResolvedValue(0),
  };
}
