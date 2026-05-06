import { LanggraphService } from './langgraph.service';
import { AIMessage, fakeModel } from 'langchain';
import { CvEmbeddingsService } from '../../cv/embeddings/cv-summary-embeddings.service';
import { MemorySaver } from '@langchain/langgraph';
import { FakeBuiltModel } from '@langchain/core/testing';

describe('LanggraphService', () => {
  let service: LanggraphService;

  it('should generate cover letter for user', async () => {
    const coverLetterGeneratorLlm: FakeBuiltModel = fakeModel()
      .respond(new AIMessage({ content: 'cover letter content 1' }))
      .respond(new AIMessage({ content: 'cover letter content 2' }));
    const critiqueLlm: FakeBuiltModel = fakeModel().respond(
      new AIMessage({ content: 'critique content 1' }),
    );
    const jobEvaluatorLlm: FakeBuiltModel = fakeModel().structuredResponse({
      isValidJob: true,
    });
    const cvEmbeddingsService: CvEmbeddingsService = {
      ensureCvAndEmbeddings: jest.fn(() => 'cv-id'),
      createEmbeddingsForJobDescription: jest.fn(async () => [
        {
          embedding: [],
          weight: 1,
        },
      ]),
      getJobAndCvMatchingScore: jest.fn(async () => 1),
    } as unknown as CvEmbeddingsService;

    const checkpointer = new MemorySaver();
    service = new LanggraphService(
      jobEvaluatorLlm,
      coverLetterGeneratorLlm,
      critiqueLlm,
      cvEmbeddingsService,
      checkpointer,
    );

    const job = {
      id: 'job-id',
      title: 'Software Engineer',
      description: 'Software Engineer',
      companyName: 'Company',
    };
    const jobEvaluatorSpy = jest.spyOn(jobEvaluatorLlm, 'withStructuredOutput');
    const graph = await service.build();
    const result = await graph.invoke(
      {
        cvText: 'cv text',
        maxAppliedJobs: 1,
        jobs: [job],
        userId: 'user-id',
      },
      {
        configurable: { thread_id: '1' },
      },
    );
    expect(result.coverLetters).toBeDefined();
    expect(result.coverLetters[0].coverLetter).toBe(
      'AI: cover letter content 2',
    );
    expect(critiqueLlm.callCount).toBe(1);
    expect(coverLetterGeneratorLlm.callCount).toBe(2);
    expect(jobEvaluatorSpy).toHaveBeenCalledTimes(1);
  });

  it('should skip llm calls for the first job if it is not passing embedding matching', async () => {
    const coverLetterGeneratorLlm: FakeBuiltModel = fakeModel()
      .respond(new AIMessage({ content: 'cover letter content 1' }))
      .respond(new AIMessage({ content: 'cover letter content 2' }));
    const critiqueLlm: FakeBuiltModel = fakeModel().respond(
      new AIMessage({ content: 'critique content 1' }),
    );
    const jobEvaluatorLlm: FakeBuiltModel = fakeModel().structuredResponse({
      isValidJob: true,
    });
    const cvEmbeddingsService: CvEmbeddingsService = {
      ensureCvAndEmbeddings: jest.fn(() => 'cv-id'),
      createEmbeddingsForJobDescription: jest.fn(async () => []),
      getJobAndCvMatchingScore: jest
        .fn()
        // first job has low embedding matching score
        .mockImplementationOnce(() => 0.5)
        .mockImplementationOnce(() => 1),
    } as unknown as CvEmbeddingsService;

    const checkpointer = new MemorySaver();
    service = new LanggraphService(
      jobEvaluatorLlm,
      coverLetterGeneratorLlm,
      critiqueLlm,
      cvEmbeddingsService,
      checkpointer,
    );

    const jobs = [
      {
        id: 'job-id-1',
        title: 'Software Engineer',
        description: 'Software Engineer',
        companyName: 'Company',
      },
      {
        id: 'job-id-2',
        title: 'Data Analyst',
        description: 'Data Analyst',
        companyName: 'Company',
      },
    ];
    const jobEvaluatorSpy = jest.spyOn(jobEvaluatorLlm, 'withStructuredOutput');
    const graph = await service.build();
    const result = await graph.invoke(
      {
        cvText: 'cv text',
        maxAppliedJobs: 1,
        jobs,
        userId: 'user-id',
      },
      {
        configurable: { thread_id: '1' },
      },
    );
    expect(result.coverLetters).toBeDefined();
    expect(result.coverLetters[0].coverLetter).toBe(
      'AI: cover letter content 2',
    );
    expect(critiqueLlm.callCount).toBe(1);
    expect(coverLetterGeneratorLlm.callCount).toBe(2);
    expect(jobEvaluatorSpy).toHaveBeenCalledTimes(1);
    expect(
      cvEmbeddingsService.createEmbeddingsForJobDescription,
    ).toHaveBeenCalledTimes(2);
  });

  it('should skip cover letter generation if LLM evaluates job as invalid', async () => {
    const coverLetterGeneratorLlm: FakeBuiltModel = fakeModel();
    const critiqueLlm: FakeBuiltModel = fakeModel();

    const jobEvaluatorLlm: FakeBuiltModel = fakeModel().structuredResponse({
      isValidJob: false, // LLM rejects the job
    });

    const cvEmbeddingsService: CvEmbeddingsService = {
      ensureCvAndEmbeddings: jest.fn(() => 'cv-id'),
      createEmbeddingsForJobDescription: jest.fn(async () => []),
      getJobAndCvMatchingScore: jest.fn(async () => 1), // Passing score
    } as unknown as CvEmbeddingsService;

    const checkpointer = new MemorySaver();
    service = new LanggraphService(
      jobEvaluatorLlm,
      coverLetterGeneratorLlm,
      critiqueLlm,
      cvEmbeddingsService,
      checkpointer,
    );

    const job = {
      id: 'job-id',
      title: 'Software Engineer',
      description: 'Software Engineer',
      companyName: 'Company',
    };

    const jobEvaluatorSpy = jest.spyOn(jobEvaluatorLlm, 'withStructuredOutput');
    const graph = await service.build();

    const result = await graph.invoke(
      {
        cvText: 'cv text',
        maxAppliedJobs: 1,
        jobs: [job],
        userId: 'user-id',
      },
      { configurable: { thread_id: '1' } },
    );

    expect(result.coverLetters).toBeDefined();
    expect(result.coverLetters).toHaveLength(0); // No cover letters generated
    expect(jobEvaluatorSpy).toHaveBeenCalledTimes(1);
    expect(coverLetterGeneratorLlm.callCount).toBe(0);
  });

  it('should handle LLM evaluation error gracefully and skip the job', async () => {
    const coverLetterGeneratorLlm: FakeBuiltModel = fakeModel();
    const critiqueLlm: FakeBuiltModel = fakeModel();

    // Mock the job evaluator to throw an error
    const jobEvaluatorLlm: FakeBuiltModel = fakeModel();
    const jobEvaluatorSpy = jest
      .spyOn(jobEvaluatorLlm, 'withStructuredOutput')
      .mockReturnValue({
        invoke: jest.fn().mockRejectedValue(new Error('LLM Error')),
      } as any);

    const cvEmbeddingsService: CvEmbeddingsService = {
      ensureCvAndEmbeddings: jest.fn(() => 'cv-id'),
      createEmbeddingsForJobDescription: jest.fn(async () => []),
      getJobAndCvMatchingScore: jest.fn(async () => 1),
    } as unknown as CvEmbeddingsService;

    const checkpointer = new MemorySaver();
    service = new LanggraphService(
      jobEvaluatorLlm,
      coverLetterGeneratorLlm,
      critiqueLlm,
      cvEmbeddingsService,
      checkpointer,
    );

    const job = {
      id: 'job-id',
      title: 'Software Engineer',
      description: 'Software Engineer',
      companyName: 'Company',
    };

    const graph = await service.build();

    const result = await graph.invoke(
      {
        cvText: 'cv text',
        maxAppliedJobs: 1,
        jobs: [job],
        userId: 'user-id',
      },
      { configurable: { thread_id: '1' } },
    );

    expect(result.coverLetters).toHaveLength(0);
    expect(jobEvaluatorSpy).toHaveBeenCalledTimes(1);
    expect(coverLetterGeneratorLlm.callCount).toBe(0);
    expect(result.dismissedJobsCount).toBe(1);
  });

  it('should process multiple jobs and stop when maxAppliedJobs is reached', async () => {
    const coverLetterGeneratorLlm: FakeBuiltModel = fakeModel()
      .respond(new AIMessage({ content: 'cover letter 1' }))
      .respond(new AIMessage({ content: 'cover letter 1 rewritten' }))
      .respond(new AIMessage({ content: 'cover letter 2' }))
      .respond(new AIMessage({ content: 'cover letter 2 rewritten' }));

    const critiqueLlm: FakeBuiltModel = fakeModel()
      .respond(new AIMessage({ content: 'critique 1' }))
      .respond(new AIMessage({ content: 'critique 2' }));

    const jobEvaluatorLlm: FakeBuiltModel = fakeModel().structuredResponse({
      isValidJob: true,
    });

    const cvEmbeddingsService: CvEmbeddingsService = {
      ensureCvAndEmbeddings: jest.fn(() => 'cv-id'),
      createEmbeddingsForJobDescription: jest.fn(async () => []),
      getJobAndCvMatchingScore: jest.fn(async () => 1),
    } as unknown as CvEmbeddingsService;

    const checkpointer = new MemorySaver();
    service = new LanggraphService(
      jobEvaluatorLlm,
      coverLetterGeneratorLlm,
      critiqueLlm,
      cvEmbeddingsService,
      checkpointer,
    );

    const jobs = [
      {
        id: '1',
        title: 'Job 1',
        description: 'Desc 1',
        companyName: 'Company 1',
      },
      {
        id: '2',
        title: 'Job 2',
        description: 'Desc 2',
        companyName: 'Company 2',
      },
      {
        id: '3',
        title: 'Job 3',
        description: 'Desc 3',
        companyName: 'Company 3',
      },
    ];

    const jobEvaluatorSpy = jest.spyOn(jobEvaluatorLlm, 'withStructuredOutput');
    const graph = await service.build();

    const result = await graph.invoke(
      {
        cvText: 'cv text',
        maxAppliedJobs: 2, // Only apply to 2 jobs, despite passing 3
        jobs,
        userId: 'user-id',
      },
      { configurable: { thread_id: '1' } },
    );

    expect(result.appliedJobsCount).toBe(2);
    expect(result.coverLetters).toHaveLength(2);
    expect(result.coverLetters[0].coverLetter).toContain(
      'cover letter 1 rewritten',
    );
    expect(result.coverLetters[1].coverLetter).toContain(
      'cover letter 2 rewritten',
    );
    expect(jobEvaluatorSpy).toHaveBeenCalledTimes(2); // Never evaluated the 3rd job
    expect(coverLetterGeneratorLlm.callCount).toBe(4); // 2 jobs * 2 iterations
  });

  it('should retry cover letter generation if LLM for cover letter generation fails initially', async () => {
    const coverLetterGeneratorLlm: FakeBuiltModel = fakeModel()
      .respond(new Error('LLM Error during cover letter generation'))
      .respond(new AIMessage({ content: 'cover letter content 1' })) // Retry works
      .respond(new AIMessage({ content: 'cover letter content 2' })); // Rewrite works

    const critiqueLlm: FakeBuiltModel = fakeModel().respond(
      new AIMessage({ content: 'critique content 1' }),
    );

    const jobEvaluatorLlm: FakeBuiltModel = fakeModel().structuredResponse({
      isValidJob: true,
    });

    const cvEmbeddingsService: CvEmbeddingsService = {
      ensureCvAndEmbeddings: jest.fn(() => 'cv-id'),
      createEmbeddingsForJobDescription: jest.fn(async () => []),
      getJobAndCvMatchingScore: jest.fn(async () => 1),
    } as unknown as CvEmbeddingsService;

    const checkpointer = new MemorySaver();
    service = new LanggraphService(
      jobEvaluatorLlm,
      coverLetterGeneratorLlm,
      critiqueLlm,
      cvEmbeddingsService,
      checkpointer,
    );

    const job = {
      id: 'job-id',
      title: 'Software Engineer',
      description: 'Software Engineer',
      companyName: 'Company',
    };

    const graph = await service.build();

    const result = await graph.invoke(
      {
        cvText: 'cv text',
        maxAppliedJobs: 1,
        jobs: [job],
        userId: 'user-id',
      },
      { configurable: { thread_id: '1' } },
    );

    expect(result.coverLetters).toHaveLength(1);
    expect(result.coverLetters[0].coverLetter).toBe(
      'AI: cover letter content 2',
    );

    // First attempt throws error, then it retries.
    // Total invokes: 1 (error) + 1 (generate) + 1 (rewrite) = 3
    expect(coverLetterGeneratorLlm.callCount).toBe(3);
  });

  it('should retry cover letter generation if LLM for critique fails initially', async () => {
    // Because the retry policy is on the individual node ('critique_cover_letter'),
    // a failure in the critique step will NOT cause the entire subgraph to restart from scratch.
    const coverLetterGeneratorLlm: FakeBuiltModel = fakeModel()
      .respond(new AIMessage({ content: 'cover letter content 1' })) // 1st generation
      .respond(new AIMessage({ content: 'cover letter content 2' })); // Rewrite works

    const critiqueLlm: FakeBuiltModel = fakeModel()
      .respond(new Error('LLM Error during critique')) // 1st critique attempt throws error
      .respond(new AIMessage({ content: 'critique content 1' })); // Retry works

    const jobEvaluatorLlm: FakeBuiltModel = fakeModel().structuredResponse({
      isValidJob: true,
    });

    const cvEmbeddingsService: CvEmbeddingsService = {
      ensureCvAndEmbeddings: jest.fn(() => 'cv-id'),
      createEmbeddingsForJobDescription: jest.fn(async () => []),
      getJobAndCvMatchingScore: jest.fn(async () => 1),
    } as unknown as CvEmbeddingsService;

    const checkpointer = new MemorySaver();
    service = new LanggraphService(
      jobEvaluatorLlm,
      coverLetterGeneratorLlm,
      critiqueLlm,
      cvEmbeddingsService,
      checkpointer,
    );

    const job = {
      id: 'job-id',
      title: 'Software Engineer',
      description: 'Software Engineer',
      companyName: 'Company',
    };

    const graph = await service.build();

    const result = await graph.invoke(
      {
        cvText: 'cv text',
        maxAppliedJobs: 1,
        jobs: [job],
        userId: 'user-id',
      },
      { configurable: { thread_id: '1' } },
    );

    expect(result.coverLetters).toHaveLength(1);
    expect(result.coverLetters[0].coverLetter).toBe(
      'AI: cover letter content 2',
    );

    // Total invokes for generator: 1st gen + rewrite = 2
    expect(coverLetterGeneratorLlm.callCount).toBe(2);
    // Total invokes for critique: error + success = 2
    expect(critiqueLlm.callCount).toBe(2);
  });
});
