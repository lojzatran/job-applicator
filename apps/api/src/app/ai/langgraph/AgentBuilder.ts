import { StateGraph, END, START } from '@langchain/langgraph';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StateSchema } from '@langchain/langgraph';
import { JobSchema } from '../../jobs/types';
import { PromptTemplate } from '@langchain/core/prompts';
import z from 'zod';
import { JobsService } from '../../jobs/jobs.service';

export class AgentBuilder {
  private StateSchema = new StateSchema({
    isValidJob: z.boolean(),
    job: JobSchema.optional(),
    maxAppliedJobs: z.number(),
    appliedJobsCount: z.number().default(0),
    jobs: z.array(JobSchema),
    cvText: z.string(),
    coverLetter: z.string().optional(),
  });

  private jobEvaluatorLlm: BaseChatModel;
  private coverLetterGeneratorLlm: BaseChatModel;
  private jobsService: JobsService;

  constructor(
    jobEvaluatorLlm: BaseChatModel,
    coverLetterGeneratorLlm: BaseChatModel | null,
    jobsService: JobsService,
  ) {
    this.jobEvaluatorLlm = jobEvaluatorLlm;
    this.coverLetterGeneratorLlm = coverLetterGeneratorLlm ?? jobEvaluatorLlm;
    this.jobsService = jobsService;
  }

  private jobSupplier(state: typeof this.StateSchema.State) {
    const [job, ...remainingJobs] = state.jobs;
    return { job, jobs: remainingJobs };
  }

  private shouldContinue(state: typeof this.StateSchema.State) {
    console.log(
      `Should continue: ${state.appliedJobsCount} >= ${state.maxAppliedJobs}`,
    );
    if (!state.job || state.appliedJobsCount >= state.maxAppliedJobs) {
      return END;
    }
    return 'job_evaluator';
  }

  private async evaluateJob(state: typeof this.StateSchema.State) {
    const template = PromptTemplate.fromTemplate(`
        You are an experienced technical recruiter and hiring manager.

        Your task is to evaluate if a candidate matches a job description.

        RULES:
        - Be strict and realistic.
        - The candidate should meet most core requirements (not everything, but clearly relevant).
        - Ignore minor or nice-to-have requirements.
        - Focus on actual ability to do the job, not just keyword matching.

        INPUTS:
        1) Candidate CV:
        {cvText}

        2) Job Title:
        {jobTitle}

        3) Job Description:
        {jobDescription}
      `);

    const prompt = await template.invoke({
      cvText: state.cvText,
      jobTitle: state.job!.title,
      jobDescription: state.job!.description,
    });

    console.log(`Evaluating job: ${JSON.stringify(state.job)}`);

    const response = await this.jobEvaluatorLlm
      .withStructuredOutput(z.boolean())
      .invoke(prompt);

    return { isValidJob: response };
  }

  private filterJobs(state: typeof this.StateSchema.State) {
    const isValidJob = state.isValidJob;
    if (isValidJob) {
      return 'cover_letter_generator';
    }
    return 'job_supplier';
  }

  private async generateCoverLetter(state: typeof this.StateSchema.State) {
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

    return {
      coverLetter: response.content,
    };
  }

  private async persistJobApplication(state: typeof this.StateSchema.State) {
    await this.jobsService.saveJobApplication(
      state.job!,
      state.coverLetter!,
    );

    return {
      appliedJobsCount: state.appliedJobsCount + 1,
    };
  }

  build() {
    const stateGraph = new StateGraph(this.StateSchema);

    stateGraph
      .addNode('job_supplier', this.jobSupplier.bind(this))
      .addNode('job_evaluator', this.evaluateJob.bind(this), {
        retryPolicy: { maxAttempts: 3 },
      })
      .addNode('cover_letter_generator', this.generateCoverLetter.bind(this), {
        retryPolicy: { maxAttempts: 3 },
      })
      .addNode('persistence', this.persistJobApplication.bind(this))
      .addEdge(START, 'job_supplier')
      .addConditionalEdges('job_supplier', this.shouldContinue, [
        'job_evaluator',
        END,
      ])
      .addConditionalEdges('job_evaluator', this.filterJobs, [
        'cover_letter_generator',
        'job_supplier',
      ])
      .addEdge('cover_letter_generator', 'persistence')
      .addEdge('persistence', 'job_supplier');

    return stateGraph.compile();
  }
}
