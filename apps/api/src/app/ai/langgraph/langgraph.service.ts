import {
  MemorySaver,
  StateGraph,
  END,
  START,
  CompiledStateGraph,
} from '@langchain/langgraph';
import { withLangGraph } from '@langchain/langgraph/zod';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { JobSchema } from '../../jobs/types';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { CoverLetterGraph } from './graphs/CoverLetterGraph';
import { CvEmbeddingsService } from '../../cv/embeddings/cv-summary-embeddings.service';
import { Inject, Injectable } from '@nestjs/common';
import {
  COVER_LETTER_GENERATOR_LLM,
  CRITIQUE_LLM,
  JOB_EVALUATOR_LLM,
} from '../ai.constants';
import { createLogger } from '@apps/shared';

interface CoverLetterEntry {
  url: string;
  coverLetter: string;
}

const CoverLetterEntrySchema = z.object({
  url: z.string(),
  coverLetter: z.string(),
});

const AgentStateSchema = z.object({
  isValidJob: z.boolean(),
  job: JobSchema.optional(),
  maxAppliedJobs: z.number(),
  appliedJobsCount: z.number().default(0),
  jobs: z.array(JobSchema),
  cvText: z.string(),
  cvEntityId: z.number(),
  coverLetters: withLangGraph(z.array(CoverLetterEntrySchema), {
    reducer: {
      schema: CoverLetterEntrySchema,
      fn: (
        currentCoverLetters: CoverLetterEntry[],
        newCoverLetter: CoverLetterEntry,
      ) => [...(currentCoverLetters ?? []), newCoverLetter],
    },
    default: () => [],
  }),
});

type AgentState = z.infer<typeof AgentStateSchema>;

const THRESHOLD = 0.9;

@Injectable()
export class LanggraphService {
  private readonly coverLetterSubgraph;
  private readonly logger = createLogger('langgraph-service');

  constructor(
    @Inject(JOB_EVALUATOR_LLM)
    private readonly jobEvaluatorLlm: BaseChatModel,
    @Inject(COVER_LETTER_GENERATOR_LLM)
    coverLetterGeneratorLlm: BaseChatModel,
    @Inject(CRITIQUE_LLM)
    critiqueLlm: BaseChatModel,
    private readonly cvEmbeddingsService: CvEmbeddingsService,
  ) {
    this.coverLetterSubgraph = new CoverLetterGraph(
      coverLetterGeneratorLlm,
      critiqueLlm,
    ).build();
  }

  private async summarizeCv(state: AgentState) {
    this.logger.info('Summarizing CV...');

    const cvEntityId = await this.cvEmbeddingsService.ensureCvAndEmbeddings(
      state.cvText,
    );

    return { cvEntityId };
  }

  private jobSupplier(state: AgentState) {
    this.logger.info(`Job supplier: ${JSON.stringify(state.jobs)}`);
    const [job, ...remainingJobs] = state.jobs;
    this.logger.info(`Job supplier: ${JSON.stringify(job)}`);
    return { job, jobs: remainingJobs };
  }

  private shouldContinue(state: AgentState) {
    this.logger.info(
      `Should continue: ${state.appliedJobsCount} >= ${state.maxAppliedJobs}`,
    );
    if (!state.job || state.appliedJobsCount >= state.maxAppliedJobs) {
      return END;
    }
    return 'job_evaluator';
  }

  private async evaluateJob(state: AgentState) {
    this.logger.info(`Evaluating job: ${JSON.stringify(state.job?.title)}`);

    try {
      const jobDescriptionEmbedding =
        await this.cvEmbeddingsService.createEmbeddingsForJobDescription(
          state.job!.description,
        );
      const jobDescriptionEmbeddingVectors = jobDescriptionEmbedding.map(
        (embedding) => ({
          embedding: embedding.embedding,
          weight: 1,
        }),
      );
      const score = await this.cvEmbeddingsService.getJobAndCvMatchingScore(
        state.cvEntityId,
        jobDescriptionEmbeddingVectors,
      );

      this.logger.info(`Job score for ${state.job?.title}: ${score}`);

      if (score > THRESHOLD) {
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
          - Return true if the candidate meets most core requirements (not everything, but clearly relevant).
          - Return false otherwise
          - Return only true or false, no other text or formatting, so that it can be parsed to boolean.
        `);

        const prompt = await template.invoke({
          cvText: state.cvText,
          jobTitle: state.job!.title,
          jobDescription: state.job!.description,
        });

        const response = await this.jobEvaluatorLlm
          .withStructuredOutput(z.enum(['true', 'false']))
          .invoke(prompt);
        this.logger.info(`Evaluated job: ${response}`);
        return { isValidJob: response.toLowerCase() === 'true' };
      } else {
        return { isValidJob: false };
      }
    } catch (error) {
      console.error('Failed to evaluate job', error);
      return { isValidJob: false };
    }
  }

  private filterJobs(state: AgentState) {
    const isValidJob = state.isValidJob;
    this.logger.info(`Filter jobs: ${isValidJob}`);
    if (isValidJob) {
      return 'cover_letter_generator';
    }
    return 'job_supplier';
  }

  private async generateCoverLetter(state: AgentState) {
    const response = await this.coverLetterSubgraph.invoke({
      cvText: state.cvText,
      job: state.job,
    });
    return {
      appliedJobsCount: state.appliedJobsCount + 1,
      coverLetters: {
        url: state.job!.url,
        coverLetter: response.coverLetter,
      },
    };
  }

  build(): CompiledStateGraph<any, any, any, any, any, any> {
    return new StateGraph(AgentStateSchema)
      .addNode('job_supplier', this.jobSupplier.bind(this))
      .addNode('cv_summarizer', this.summarizeCv.bind(this))
      .addNode('job_evaluator', this.evaluateJob.bind(this), {
        retryPolicy: { maxAttempts: 3 },
      })
      .addNode('cover_letter_generator', this.generateCoverLetter.bind(this))
      .addEdge(START, 'cv_summarizer')
      .addEdge('cv_summarizer', 'job_supplier')
      .addConditionalEdges('job_supplier', this.shouldContinue.bind(this), [
        'job_evaluator',
        END,
      ])
      .addConditionalEdges('job_evaluator', this.filterJobs.bind(this), [
        'cover_letter_generator',
        'job_supplier',
      ])
      .addEdge('cover_letter_generator', 'job_supplier')
      .compile({ checkpointer: new MemorySaver() });
  }
}
