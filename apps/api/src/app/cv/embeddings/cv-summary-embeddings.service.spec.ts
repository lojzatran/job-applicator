import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import { env } from '../../../utils/env';
import { CvEmbeddingsService } from './cv-summary-embeddings.service';

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
        splitText: jest.fn().mockResolvedValue([
          '   ',
          '<p>Product manager with strong ops background</p>',
          '<div>\n</div>',
        ]),
      } as never);

      const jobDescription = `<div>${'role '.repeat(800)}</div>`;
      const embeddings = await service.createEmbeddingsForJobDescription(
        jobDescription,
      );

      expect(embeddings).toEqual([[1, 2, 3]]);
      expect(createEmbeddingsSpy).toHaveBeenCalledTimes(1);
      expect(createEmbeddingsSpy).toHaveBeenCalledWith(
        'Product manager with strong ops background',
      );
    });
  });

  describe('CV embedding persistence guards', () => {
    it('returns early for empty embeddings and throws when the pool is missing', async () => {
      const service = createService();

      await expect(service.insertCvEmbeddings([])).resolves.toBeUndefined();
      await expect(
        service.insertCvEmbeddings([
          {
            cvId: 1,
            embedding: [1, 2, 3],
            weight: 1,
            model: env.EMBEDDING_MODEL,
          },
        ]),
      ).rejects.toThrow('Embeddings pool not initialized');
    });

    it('uses the provided manager when inserting embeddings inside a transaction', async () => {
      const service = createService();
      const query = jest.fn().mockResolvedValue(undefined);
      const manager = {
        query,
      };

      await expect(
        service.insertCvEmbeddings(
          [
            {
              cvId: 1,
              embedding: [1, 2, 3],
              weight: 1,
              model: env.EMBEDDING_MODEL,
            },
          ],
          manager,
        ),
      ).resolves.toBeUndefined();

      expect(query).toHaveBeenCalledTimes(1);
      expect(query.mock.calls[0][0]).toContain('INSERT INTO "cv_embedding"');
    });
  });
});

function createService(): CvEmbeddingsService {
  const cvParserLlm = {
    withStructuredOutput: jest.fn(),
  } as unknown as BaseChatModel;
  const embeddingModel = {
    embedQuery: jest.fn(),
  } as unknown as Embeddings;

  return new CvEmbeddingsService(cvParserLlm, embeddingModel);
}
