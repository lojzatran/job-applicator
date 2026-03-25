import {
  MemorySaver,
  StateGraph,
  END,
  START,
  ReducedValue,
} from '@langchain/langgraph';
import * as hub from 'langchain/hub/node';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StateSchema } from '@langchain/langgraph';
import { JobSchema } from '../../jobs/types';
import { PromptTemplate } from '@langchain/core/prompts';
import z from 'zod';
import { CoverLetterGraph } from './graphs/CoverLetterGraph';

export class AgentBuilder {
  private StateSchema = new StateSchema({
    isValidJob: z.boolean(),
    job: JobSchema.optional(),
    maxAppliedJobs: z.number(),
    appliedJobsCount: z.number().default(0),
    jobs: z.array(JobSchema),
    cvText: z.string(),
    coverLetters: new ReducedValue(
      z
        .array(z.object({ url: z.string(), coverLetter: z.string() }))
        .default(() => []),
      {
        inputSchema: z.object({ url: z.string(), coverLetter: z.string() }),
        reducer: (currentCoverLetters, newCoverLetter) => [
          ...currentCoverLetters,
          newCoverLetter,
        ],
      },
    ),
  });

  private jobEvaluatorLlm: BaseChatModel;
  private coverLetterSubgraph;

  constructor(
    jobEvaluatorLlm: BaseChatModel,
    coverLetterGeneratorLlm: BaseChatModel,
    critiqueLlm: BaseChatModel,
  ) {
    this.jobEvaluatorLlm = jobEvaluatorLlm;
    this.coverLetterSubgraph = new CoverLetterGraph(
      coverLetterGeneratorLlm,
      critiqueLlm,
    ).build();
  }

  private async summarizeCv(state: typeof this.StateSchema.State) {
    const template = await hub.pull('lo-b/summarize-cv');
    const prompt = await template.invoke({
      cv: state.cvText,
    });

    const response = await this.jobEvaluatorLlm.invoke(prompt);

    return { cvText: response.content };
  }

  private jobSupplier(state: typeof this.StateSchema.State) {
    const [job, ...remainingJobs] = state.jobs;
    console.log(`Job supplier: ${JSON.stringify(job)}`);
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

        OUTPUT:
        - Return true if the candidate matches the job description
        - Return false otherwise
        - Return only true or false, no other text or formatting, so that it can be parsed to boolean.
      `);

    const prompt = await template.invoke({
      cvText: state.cvText,
      jobTitle: state.job!.title,
      jobDescription: state.job!.description,
    });

    try {
      const response = await this.jobEvaluatorLlm
        .withStructuredOutput(z.boolean())
        .invoke(prompt);
      console.log(`Evaluated job: ${response}`);
      return { isValidJob: response };
    } catch (e) {
      console.log(`Evaluated job error: ${e}`);
      return { isValidJob: false };
    }
  }

  private filterJobs(state: typeof this.StateSchema.State) {
    const isValidJob = state.isValidJob;
    console.log(`Filter jobs: ${isValidJob}`);
    if (isValidJob) {
      return 'cover_letter_generator';
    }
    return 'job_supplier';
  }

  private async generateCoverLetter(state: typeof this.StateSchema.State) {
    const response = await this.coverLetterSubgraph.invoke(
      {
        cvText: state.cvText,
        job: state.job,
      },
    );
    return {
      appliedJobsCount: state.appliedJobsCount + 1,
      coverLetters: {
        url: state.job!.url,
        coverLetter: response.coverLetter,
      },
    };
  }

  build() {
    const stateGraph = new StateGraph(this.StateSchema);

    stateGraph
      .addNode('job_supplier', this.jobSupplier.bind(this))
      .addNode('cv_summarizer', this.summarizeCv.bind(this))
      .addNode('job_evaluator', this.evaluateJob.bind(this), {
        retryPolicy: { maxAttempts: 3 },
      })
      .addNode('cover_letter_generator', this.generateCoverLetter.bind(this))
      .addEdge(START, 'cv_summarizer')
      .addEdge('cv_summarizer', 'job_supplier')
      .addConditionalEdges('job_supplier', this.shouldContinue, [
        'job_evaluator',
        END,
      ])
      .addConditionalEdges('job_evaluator', this.filterJobs, [
        'cover_letter_generator',
        'job_supplier',
      ])
      .addEdge('cover_letter_generator', 'job_supplier');

    return stateGraph.compile({ checkpointer: new MemorySaver() });
  }
}
