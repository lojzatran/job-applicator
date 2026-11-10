import { Inject, Injectable } from '@nestjs/common';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { DataSource, EntityManager } from 'typeorm';
import { Cv, createLogger } from '@apps/shared';
import * as crypto from 'crypto';
import type { z } from 'zod';
import { CV_PARSER_LLM } from '../ai/ai.constants';
import { CvSchema } from './cv-schema';

@Injectable()
export class CvService {
  private readonly logger = createLogger(CvService.name);

  constructor(
    @Inject(CV_PARSER_LLM)
    private readonly cvParserLlm: BaseChatModel,
    private readonly dataSource: DataSource,
  ) {}

  async parseCv(cvText: string): Promise<z.infer<typeof CvSchema>> {
    const template = ChatPromptTemplate.fromMessages([
      [
        'system',
        `**You are a high-fidelity CV parsing agent. Your goal is to map the raw CV text into a structured JSON format.**

      ## Instructions

      1. **Preserve Exact Wording**: NEVER rewrite, summarize, or improve the candidate's text. Copy and paste the original text into the fields.
      2. **Isolate Sections**: Distribute the CV content across the appropriate fields. Do NOT put information belonging to skills, experience, or education into the 'summary' field.
      3. **Field Mapping Logic**:
         - **summary**: Use only the "About Me" or "Professional Profile" section. If the CV lacks a summary, return an empty string ("").
         - **skills**: Map the list of technologies, tools, and soft skills here.
         - **experience**: Map each work history entry. Format each string as: \`<companyName> - <jobTitle>: <jobDescription>\`.
         - **projects**: Map each project. Format each string as: \`<projectName>: <projectDescription>\`.
         - **education**: Map educational history. Format each string as: \`<school> - <degree> - <description optional>\`.
         - **other**: Maps any text that does not belong to the categories above.
      4. **Handle Missing Data**: Always include all fields. If a section is missing from the CV, return an empty array ([]) for list fields or an empty string ("") for summary. Do not return null or omit fields. Do not invent facts.

      ## Example
      Input: "John Doe. Java developer with 5 years exp. Experience: Acme Corp - Senior Dev: Built web apps. Education: MIT - CS degree. Skills: Java, Spring."
      Output: {{
        "summary": "Java developer with 5 years exp.",
        "skills": ["Java", "Spring"],
        "experience": ["Acme Corp - Senior Dev: Built web apps."],
        "projects": [],
        "education": ["MIT - CS degree."],
        "other": ["John Doe."]
      }}`,
      ],
      ['human', '## Input CV Text\n{cvText}'],
    ]);

    const llm = this.cvParserLlm.withStructuredOutput<z.infer<typeof CvSchema>>(
      CvSchema,
      {
        method: 'jsonSchema',
      },
    );

    const parsedCv = await template.pipe(llm).invoke({ cvText });
    this.logger.debug(`Parsed CV: ${JSON.stringify(parsedCv)}`);

    return parsedCv;
  }

  async ensureCvEntity(manager: EntityManager, cvText: string): Promise<Cv> {
    const cvHash = crypto.createHash('md5').update(cvText).digest('hex');
    const cvRepository = manager.getRepository(Cv);
    const cvEntity = await cvRepository.findOne({
      where: { hash: cvHash },
    });

    if (!cvEntity) {
      await cvRepository
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

      const persistedCvEntity = await cvRepository.findOne({
        where: { hash: cvHash },
      });

      if (!persistedCvEntity) {
        throw new Error(`Failed to reload CV row for hash ${cvHash}`);
      }

      return persistedCvEntity;
    } else {
      return cvEntity;
    }
  }

  async ensureParsedCv(cvText: string): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const cvEntity = await this.ensureCvEntity(manager, cvText);
      if (!cvEntity.skills) {
        const parsedCv = await this.parseCv(cvEntity.rawText);
        await manager.update(Cv, cvEntity.id, parsedCv);
      }
      return cvEntity.id;
    });
  }
}
