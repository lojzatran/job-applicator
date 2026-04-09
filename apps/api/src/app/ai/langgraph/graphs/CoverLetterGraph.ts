import { END, START, StateGraph } from '@langchain/langgraph';
import { z } from 'zod';
import { JobSchema } from '../../../jobs/types';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { PromptTemplate } from '@langchain/core/prompts';
import { getBufferString } from '@langchain/core/messages';

const CoverLetterSchema = z.object({
  cvText: z.string(),
  job: JobSchema,
  coverLetter: z.string(),
  critique: z.string(),
  counter: z.number().default(0),
});

type CoverLetterState = z.infer<typeof CoverLetterSchema>;

export class CoverLetterGraph {
  private coverLetterGeneratorLlm: BaseChatModel;
  private critiqueLlm: BaseChatModel;
  private readonly MAX_ITERATIONS = 1;

  constructor(
    coverLetterGeneratorLlm: BaseChatModel,
    critiqueLlm: BaseChatModel | null,
  ) {
    this.coverLetterGeneratorLlm = coverLetterGeneratorLlm;
    this.critiqueLlm = critiqueLlm ?? coverLetterGeneratorLlm;
  }

  private async generateCoverLetter(state: CoverLetterState) {
    const template = PromptTemplate.fromTemplate(`
        You are an experienced hiring manager and professional copywriter.

        Your task is to write a tailored, concise, and compelling cover letter.

        INPUTS:
        1) Candidate CV:
        {cv}

        2) Job Title:
        {jobTitle}
        
        3) Job Description:
        {jobDescription}
        
        4) Company Name:
        {companyName}

        INSTRUCTIONS:
        - Detect the language of the job description and write the cover letter in the SAME language.
        - Match the tone and style of the job description (formal, casual, technical, etc.).
        - Always remain polite and professional (e.g., in Czech always use formal address, never informal "tykání").
        - Keep it 200–300 words.
        - Focus only on the most relevant experience and skills for this job.
        - Do NOT repeat the CV verbatim — summarize and tailor.
        - Show clear alignment with the job requirements.
        - Highlight 2–3 key achievements or strengths.
        - Use specific technologies and keywords from the job description.
        - Sound natural and human, not generic or robotic.
        - Avoid clichés (e.g., "I am passionate", "team player", etc.).
        - If company name is provided, personalize the letter slightly.
        - If the job description language is unclear, default to English.
        - Keep the length between 200 - 400 words.

        OUTPUT:
        Write a complete cover letter with:
        - Opening paragraph (role + interest)
        - Middle paragraph(s) (relevant experience + impact)
        - Closing paragraph (interest + call to action)

        No explanations, only the final cover letter.
        `);

    const prompt = await template.invoke({
      cv: state.cvText,
      jobTitle: state.job!.title,
      jobDescription: state.job!.description,
      companyName: state.job!.company,
    });

    const response = await this.coverLetterGeneratorLlm.invoke(prompt);

    return { coverLetter: getBufferString([response]) };
  }

  private async rewriteCoverLetter(state: CoverLetterState) {
    const template = PromptTemplate.fromTemplate(`
        You are an assistant who is specialized in correcting and writing cover letters.

        Your task is to rewrite a cover letter according to the provided feedback.

        INPUTS:
        Cover letter:
        {coverLetter}

        Feedback:
        {critique}

        OUTPUT:
        - Final cover letter. Do not add any additional text, just output the cover letter.
        `);

    const prompt = await template.invoke({
      coverLetter: state.coverLetter,
      critique: state.critique,
    });

    const response = await this.coverLetterGeneratorLlm.invoke(prompt);

    return { coverLetter: getBufferString([response]) };
  }

  private async critiqueCoverLetter(state: CoverLetterState) {
    const template = PromptTemplate.fromTemplate(`
        You are an experienced hiring manager and professional copywriter.

        Your task is to critique a cover letter and provide feedback.

        INPUTS:
        Cover letter:
        {coverLetter}

        OUTPUT:
        - Your critique in points sorted from most critical to least critical.
        `);

    const prompt = await template.invoke({ coverLetter: state.coverLetter });

    const response = await this.critiqueLlm.invoke(prompt);

    return { critique: getBufferString([response]) };
  }

  private increaseCounter(state: CoverLetterState) {
    return { counter: state.counter + 1 };
  }

  private shouldContinue(state: CoverLetterState) {
    if (state.counter > this.MAX_ITERATIONS) {
      return END;
    }
    return 'critique_cover_letter';
  }

  build() {
    const workflow = new StateGraph(CoverLetterSchema);

    workflow
      .addNode('generate_cover_letter', this.generateCoverLetter.bind(this))
      .addNode('increase_counter', this.increaseCounter)
      .addNode('critique_cover_letter', this.critiqueCoverLetter.bind(this))
      .addNode('rewrite_cover_letter', this.rewriteCoverLetter.bind(this))
      .addEdge(START, 'generate_cover_letter')
      .addEdge('generate_cover_letter', 'increase_counter')
      .addConditionalEdges('increase_counter', this.shouldContinue.bind(this), [
        'critique_cover_letter',
        END,
      ])
      .addEdge('critique_cover_letter', 'rewrite_cover_letter')
      .addEdge('rewrite_cover_letter', 'increase_counter');

    return workflow.compile();
  }
}
