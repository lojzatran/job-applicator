import {
  StateGraph,
  END,
  START,
  CompiledStateGraph,
  Annotation,
  BaseCheckpointSaver,
} from '@langchain/langgraph';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { JobSchema } from '../../jobs/types';
import { z } from 'zod';
import { CoverLetterGraph } from './graphs/CoverLetterGraph';
import { Inject, Injectable } from '@nestjs/common';
import {
  CHECKPOINTER,
  COVER_LETTER_GENERATOR_LLM,
  CRITIQUE_LLM,
  JOB_EVALUATOR,
} from '../ai.constants';
import { createLogger } from '@apps/shared';
import type { JobEvaluator } from '../job-evaluator/job-evaluator';

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

@Injectable()
export class LanggraphService {
  private readonly coverLetterSubgraph;
  private readonly logger = createLogger(LanggraphService.name);

  constructor(
    @Inject(JOB_EVALUATOR)
    private readonly jobEvaluator: JobEvaluator,
    @Inject(COVER_LETTER_GENERATOR_LLM)
    coverLetterGeneratorLlm: BaseChatModel,
    @Inject(CRITIQUE_LLM)
    critiqueLlm: BaseChatModel,
    @Inject(CHECKPOINTER)
    private readonly checkpointer: BaseCheckpointSaver,
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

    const cvEntityId = await this.jobEvaluator.prepareCv(state.cvText);

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
      const { verdict, score } = await this.jobEvaluator.evaluate(
        { entityId: state.cvEntityId, text: state.cvText },
        state.job!,
      );
      this.logger.info(
        `Job evaluation for ${state.job?.title}: ${verdict} (score ${score})`,
      );
      const isValidJob = verdict === 'apply';
      return {
        isValidJob,
        url: isValidJob ? null : state.job?.url,
        evaluatedJobsCount: state.evaluatedJobsCount + 1,
        dismissedJobsCount: state.dismissedJobsCount + (isValidJob ? 0 : 1),
      };
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
        checkpointer: this.checkpointer,
      });
  }
}
