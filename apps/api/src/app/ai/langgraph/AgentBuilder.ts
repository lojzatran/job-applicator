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
import { z } from 'zod/v4';
import { CoverLetterGraph } from './graphs/CoverLetterGraph';
import { CvEmbeddingsService } from '../../cv/embeddings/cv-summary-embeddings.service';
import { Repository } from 'typeorm';
import { Cv } from '@apps/shared';
import { env } from '../../../utils/env';
import * as crypto from 'crypto';

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
  cvEntityId: z.string(),
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

const THRESHOLD = 0.6;

export class AgentBuilder {
  private jobEvaluatorLlm: BaseChatModel;
  private coverLetterSubgraph;
  private cvEmbeddingsService: CvEmbeddingsService;

  constructor(
    jobEvaluatorLlm: BaseChatModel,
    coverLetterGeneratorLlm: BaseChatModel,
    critiqueLlm: BaseChatModel,
    cvEmbeddingsService: CvEmbeddingsService,
    private readonly cvRepository: Repository<Cv>,
  ) {
    this.cvEmbeddingsService = cvEmbeddingsService;
    this.jobEvaluatorLlm = jobEvaluatorLlm;
    this.coverLetterSubgraph = new CoverLetterGraph(
      coverLetterGeneratorLlm,
      critiqueLlm,
    ).build();
  }

  private async summarizeCv(state: AgentState) {
    console.log(`Summarizing CV...`);
    const cvHash = crypto.createHash('md5').update(state.cvText).digest('hex');

    const existingCv = await this.cvRepository.findOne({
      where: { hash: cvHash },
    });

    if (existingCv) {
      return { cvEntityId: existingCv.id };
    }

    const cvEntity = await this.cvRepository.save({
      path: 'temp',
      rawText: state.cvText,
      hash: cvHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const cvEmbedding: {
      embedding: number[];
      weight: number;
    }[] = await this.cvEmbeddingsService.createWeightedEmbeddingsForCv(
      state.cvText,
    );

    await this.cvEmbeddingsService.insertCvEmbeddings(
      cvEmbedding.map((embedding) => {
        return {
          cvId: cvEntity.id,
          embedding: embedding.embedding,
          weight: embedding.weight,
          model: env.EMBEDDING_MODEL,
          createdAt: new Date(),
        };
      }),
    );

    return { cvEntityId: cvEntity.id };
  }

  private jobSupplier(state: AgentState) {
    console.log(`Job supplier: ${JSON.stringify(state.jobs)}`);
    const [job, ...remainingJobs] = state.jobs;
    console.log(`Job supplier: ${JSON.stringify(job)}`);
    return { job, jobs: remainingJobs };
  }

  private shouldContinue(state: AgentState) {
    console.log(
      `Should continue: ${state.appliedJobsCount} >= ${state.maxAppliedJobs}`,
    );
    if (!state.job || state.appliedJobsCount >= state.maxAppliedJobs) {
      return END;
    }
    return 'job_evaluator';
  }

  private async evaluateJob(state: AgentState) {
    console.log(`Evaluating job: ${JSON.stringify(state.job?.title)}`);
    const jobDescriptionEmbedding: number[][] =
      await this.cvEmbeddingsService.createEmbeddingsForJobDescription(state.job!.description);
    const score = await this.cvEmbeddingsService.scoreJobAndCvMatching(
      state.cvEntityId,
      jobDescriptionEmbedding,
    );

    console.log(`Job score: ${score}`);

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
    } else {
      return { isValidJob: false };
    }
  }

  private filterJobs(state: AgentState) {
    const isValidJob = state.isValidJob;
    console.log(`Filter jobs: ${isValidJob}`);
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
      .addConditionalEdges('job_supplier', this.shouldContinue, [
        'job_evaluator',
        END,
      ])
      .addConditionalEdges('job_evaluator', this.filterJobs, [
        'cover_letter_generator',
        'job_supplier',
      ])
      .addEdge('cover_letter_generator', 'job_supplier')
      .compile({ checkpointer: new MemorySaver() });
  }
}
