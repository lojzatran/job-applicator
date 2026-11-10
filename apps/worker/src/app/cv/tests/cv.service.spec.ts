import { RunnableLambda } from '@langchain/core/runnables';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { DataSource, EntityManager } from 'typeorm';
import { Cv } from '@apps/shared';
import { CvService } from '../cv.service';

describe('CvService', () => {
  describe('ensureParsedCv', () => {
    const cvText = 'TypeScript developer';
    const parsedCv = {
      summary: cvText,
      skills: ['TypeScript'],
      experience: [],
      projects: [],
      education: [],
      other: [],
    };

    function setup(storedCv: Partial<Cv>) {
      const parseCv = jest.fn().mockResolvedValue(parsedCv);
      const cvParserLlm = {
        withStructuredOutput: jest
          .fn()
          .mockReturnValue(RunnableLambda.from(parseCv)),
      } as unknown as BaseChatModel;
      const manager = {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(storedCv),
        }),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      const service = new CvService(
        cvParserLlm,
        createDataSource(manager as unknown as EntityManager),
      );
      return { service, parseCv, manager };
    }

    it('parses and saves a CV that has not been parsed yet', async () => {
      const { service, parseCv, manager } = setup({
        id: 1,
        rawText: cvText,
        skills: null,
      });

      await expect(service.ensureParsedCv(cvText)).resolves.toBe(1);

      expect(parseCv).toHaveBeenCalledTimes(1);
      expect(manager.update).toHaveBeenCalledWith(Cv, 1, parsedCv);
    });

    it('does not parse a CV again', async () => {
      const { service, parseCv, manager } = setup({
        id: 1,
        rawText: cvText,
        skills: ['TypeScript'],
      });

      await expect(service.ensureParsedCv(cvText)).resolves.toBe(1);

      expect(parseCv).not.toHaveBeenCalled();
      expect(manager.update).not.toHaveBeenCalled();
    });
  });
});

function createDataSource(manager = {} as EntityManager): DataSource {
  return {
    transaction: jest.fn(
      async (callback: (manager: EntityManager) => Promise<unknown>) => {
        return callback(manager);
      },
    ),
  } as unknown as DataSource;
}
