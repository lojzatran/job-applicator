import {
  StateGraph,
  END,
  START,
  CompiledStateGraph,
  Annotation,
} from '@langchain/langgraph';
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
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { env } from '../../../utils/env';

const databaseUrl = new URL(
  `postgres://${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`,
);
databaseUrl.username = env.POSTGRES_USER;
databaseUrl.password = env.POSTGRES_PASSWORD;

interface CoverLetterEntry {
  coverLetter: string;
}

const AgentStateAnnotation = Annotation.Root({
  isValidJob: Annotation<boolean | undefined>,
  job: Annotation<z.infer<typeof JobSchema> | undefined>,
  maxAppliedJobs: Annotation<number>,
  appliedJobsCount: Annotation<number>({
    reducer: (curr, next) => next,
    default: () => 0,
  }),
  url: Annotation<string | null>,
  evaluatedJobsCount: Annotation<number>({
    reducer: (curr, next) => next,
    default: () => 0,
  }),
  dismissedJobsCount: Annotation<number>({
    reducer: (curr, next) => next,
    default: () => 0,
  }),
  jobs: Annotation<z.infer<typeof JobSchema>[]>,
  cvText: Annotation<string>,
  cvEntityId: Annotation<number>,
  coverLetters: Annotation<
    CoverLetterEntry[],
    CoverLetterEntry | CoverLetterEntry[]
  >({
    reducer: (curr, update) => {
      const current = curr ?? [];
      const updates = Array.isArray(update) ? update : [update];
      return [...current, ...updates];
    },
    default: () => [],
  }),
  userId: Annotation<string>,
});

type AgentState = typeof AgentStateAnnotation.State;

const THRESHOLD = 0.9;

@Injectable()
export class LanggraphService {
  private readonly coverLetterSubgraph;
  private readonly logger = createLogger(LanggraphService.name);

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
    if (state.cvEntityId) {
      return {};
    }

    this.logger.info('Summarizing CV...');

    const cvEntityId = await this.cvEmbeddingsService.ensureCvAndEmbeddings(
      state.cvText,
    );

    return { cvEntityId };
  }

  private jobSupplier(state: AgentState) {
    if (state.job !== undefined) {
      return {};
    }
    const [job, ...remainingJobs] = state.jobs;
    this.logger.trace(`Job supplier: ${JSON.stringify(job)}`);
    return { job, jobs: remainingJobs, cvEntityId: state.cvEntityId };
  }

  private shouldContinue(state: AgentState) {
    this.logger.trace(
      `Should continue: ${state.appliedJobsCount} >= ${state.maxAppliedJobs}`,
    );
    if (!state.job || state.appliedJobsCount >= state.maxAppliedJobs) {
      return END;
    }
    return 'job_evaluator';
  }

  private async evaluateJob(state: AgentState) {
    if (state.isValidJob !== undefined) {
      return {};
    }
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
          - Return a JSON object with the key "isValidJob" set to true if the candidate meets most core requirements.
          - Set "isValidJob" to false otherwise.
          - Example: {{ "isValidJob": true }}
        `);

        const prompt = await template.invoke({
          cvText: state.cvText,
          jobTitle: state.job!.title,
          jobDescription: state.job!.description,
        });

        const response = await this.jobEvaluatorLlm
          .withStructuredOutput(
            z.object({
              isValidJob: z.union([z.boolean(), z.string()]),
            }),
          )
          .invoke(prompt);
        this.logger.info(`Evaluated job by LLM: ${JSON.stringify(response)}`);
        const isValidJob =
          typeof response.isValidJob === 'boolean'
            ? response.isValidJob
            : response.isValidJob.trim().toLowerCase() === 'true';
        return {
          isValidJob,
          url: isValidJob ? null : state.job?.url,
          evaluatedJobsCount: state.evaluatedJobsCount + 1,
          dismissedJobsCount: state.dismissedJobsCount + (isValidJob ? 0 : 1),
        };
      } else {
        return {
          isValidJob: false,
          url: state.job?.url,
          evaluatedJobsCount: state.evaluatedJobsCount + 1,
          dismissedJobsCount: state.dismissedJobsCount + 1,
        };
      }
    } catch (error) {
      this.logger.error(error, 'Failed to evaluate job');
      return {
        isValidJob: false,
        url: state.job?.url,
        evaluatedJobsCount: state.evaluatedJobsCount + 1,
        dismissedJobsCount: state.dismissedJobsCount + 1,
      };
    }
  }

  private filterJobs(state: AgentState) {
    const isValidJob = state.isValidJob;
    this.logger.info(`Filter jobs: ${isValidJob}`);
    if (isValidJob) {
      return 'cover_letter_generator';
    }
    return 'clean_state';
  }

  private async generateCoverLetter(state: AgentState) {
    const response = await this.coverLetterSubgraph.invoke({
      cvText: state.cvText,
      job: state.job,
    });
    this.logger.debug(`Applied jobs count: ${state.appliedJobsCount}`);
    return {
      appliedJobsCount: state.appliedJobsCount + 1,
      url: state.job!.url,
      coverLetters: [
        {
          coverLetter: response.coverLetter,
        },
      ],
    };
  }

  private async cleanState(state: AgentState) {
    return {
      job: undefined,
      isValidJob: undefined,
    };
  }

  async build(): Promise<CompiledStateGraph<any, any, any, any, any, any>> {
    const checkpointer = PostgresSaver.fromConnString(databaseUrl.toString(), {
      schema: 'public',
    });

    await checkpointer.setup();

    return new StateGraph(AgentStateAnnotation)
      .addNode('job_supplier', this.jobSupplier.bind(this))
      .addNode('cv_summarizer', this.summarizeCv.bind(this))
      .addNode('job_evaluator', this.evaluateJob.bind(this), {
        retryPolicy: { maxAttempts: 3 },
      })
      .addNode('cover_letter_generator', this.generateCoverLetter.bind(this))
      .addNode('clean_state', this.cleanState.bind(this))
      .addEdge(START, 'cv_summarizer')
      .addEdge('cv_summarizer', 'job_supplier')
      .addConditionalEdges('job_supplier', this.shouldContinue.bind(this), [
        'job_evaluator',
        END,
      ])
      .addConditionalEdges('job_evaluator', this.filterJobs.bind(this), [
        'cover_letter_generator',
        'clean_state',
      ])
      .addEdge('cover_letter_generator', 'clean_state')
      .addEdge('clean_state', 'job_supplier')
      .compile({
        checkpointer,
      });
  }
}
