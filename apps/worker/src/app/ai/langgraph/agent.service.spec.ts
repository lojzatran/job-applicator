import { Test, TestingModule } from '@nestjs/testing';
import { AgentService, StreamChunk } from './agent.service';
import { JobsService } from '../../jobs/jobs.service';
import { PdfService } from '../../documents/pdf/pdf.service';
import { LanggraphService } from './langgraph.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  JobApplication,
  JobApplicationProcessingRun,
  JobEvaluationDecision,
  Cv,
  Job,
} from '@apps/shared';
import { Repository } from 'typeorm';

describe('AgentService', () => {
  let service: AgentService;
  let jobsService: jest.Mocked<JobsService>;
  let pdfService: jest.Mocked<PdfService>;
  let langgraphService: jest.Mocked<LanggraphService>;
  let processingRunRepo: jest.Mocked<Repository<JobApplicationProcessingRun>>;
  let applicationRepo: jest.Mocked<Repository<JobApplication>>;
  let cvRepo: jest.Mocked<Repository<Cv>>;
  let jobRepo: jest.Mocked<Repository<Job>>;

  const mockUserId = 'user-1';
  const mockThreadId = 'thread-1';
  const mockFilePath = 'cv.pdf';
  const mockOptions = {
    maxJobs: 5,
    linkedinEnabled: true,
    startupJobsEnabled: true,
    threadId: mockThreadId,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        {
          provide: JobsService,
          useValue: {
            fetchJobs: jest.fn(),
            filterOutProcessedJobs: jest.fn(),
          },
        },
        {
          provide: PdfService,
          useValue: {
            extractTextContent: jest.fn(),
          },
        },
        {
          provide: LanggraphService,
          useValue: {
            build: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(JobApplicationProcessingRun),
          useValue: {
            findOneBy: jest.fn(),
            update: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(JobApplication),
          useValue: {
            findOne: jest.fn(),
            countBy: jest.fn(),
            update: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Cv),
          useValue: { findOneBy: jest.fn() },
        },
        {
          provide: getRepositoryToken(Job),
          useValue: { findOneByOrFail: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
    jobsService = module.get(JobsService);
    pdfService = module.get(PdfService);
    langgraphService = module.get(LanggraphService);
    processingRunRepo = module.get(
      getRepositoryToken(JobApplicationProcessingRun),
    );
    applicationRepo = module.get(getRepositoryToken(JobApplication));
    cvRepo = module.get(getRepositoryToken(Cv));
    jobRepo = module.get(getRepositoryToken(Job));
    cvRepo.findOneBy.mockResolvedValue(null);
    jobRepo.findOneByOrFail.mockImplementation(async (where) => where as Job);
  });

  it('should complete processing run and save applications', async () => {
    const mockJobs = [
      { id: 1, url: 'job1' },
      { id: 2, url: 'job2' },
    ] as any;
    pdfService.extractTextContent.mockResolvedValue('cv text');
    jobsService.fetchJobs.mockResolvedValue(mockJobs);
    processingRunRepo.findOneBy.mockResolvedValue(null);
    processingRunRepo.create.mockImplementation((dto) => dto as any);

    const mockAgent = {
      stream: jest.fn(),
    };
    langgraphService.build.mockResolvedValue(mockAgent as any);

    async function* mockStream() {
      yield {
        job_supplier: { job: mockJobs[0], cvEntityId: 100 },
      } as StreamChunk;
      yield {
        job_evaluator: {
          cvEntityId: 100,
          evaluatedJobsCount: 1,
          uncertainJobsCount: 1,
          dismissedJobsCount: 0,
          evaluationResult: JobEvaluationDecision.UNCERTAIN,
          isValidJob: true,
          url: 'job1',
        },
      } as StreamChunk;
      yield {
        cover_letter_generator: {
          cvEntityId: 100,
          appliedJobsCount: 1,
          url: 'job1',
          coverLetters: { url: 'job1', coverLetter: 'cl1' },
        },
      } as StreamChunk;
    }

    mockAgent.stream.mockResolvedValue(mockStream());
    applicationRepo.findOne.mockResolvedValue({ id: 10 } as any);

    await service.executeAgent(mockUserId, mockFilePath, mockOptions);

    expect(pdfService.extractTextContent).toHaveBeenCalledWith(mockFilePath);
    expect(jobsService.fetchJobs).toHaveBeenCalledWith(true, true);
    expect(mockAgent.stream).toHaveBeenCalledWith(
      expect.objectContaining({ jobs: mockJobs }),
      expect.anything(),
    );
    expect(applicationRepo.findOne).toHaveBeenCalledWith({
      where: { job: { url: 'job1' }, cv: { id: 100 }, userId: mockUserId },
    });
    expect(processingRunRepo.save).toHaveBeenCalled();
    expect(applicationRepo.update).toHaveBeenCalledWith(10, {
      evaluationResult: JobEvaluationDecision.UNCERTAIN,
    });
    expect(processingRunRepo.update).toHaveBeenCalledWith(
      { threadId: mockThreadId },
      {
        evaluatedJobApplications: 1,
        uncertainJobApplications: 1,
        dismissedJobApplications: 0,
      },
    );

    // Check job application creation
    expect(applicationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        job: { url: 'job1' },
        userId: mockUserId,
        status: 'processing',
        cv: { id: 100 },
      }),
    );

    // Check job application update to applied
    expect(applicationRepo.update).toHaveBeenCalledWith(10, {
      status: 'applied',
      coverLetter: 'cl1',
    });

    // Check processing run update
    expect(processingRunRepo.update).toHaveBeenCalledWith(
      { threadId: mockThreadId },
      { appliedJobApplications: 1 },
    );

    expect(processingRunRepo.update).toHaveBeenCalledWith(
      { threadId: mockThreadId },
      { status: 'completed' },
    );
  });

  it('should update status to failed when an error occurs during execution', async () => {
    const mockJobs = [] as any;
    pdfService.extractTextContent.mockResolvedValue('cv text');
    jobsService.fetchJobs.mockResolvedValue(mockJobs);
    processingRunRepo.findOneBy.mockResolvedValue(null);
    processingRunRepo.create.mockImplementation((dto) => dto as any);

    langgraphService.build.mockRejectedValue(new Error('Graph build error'));

    await expect(
      service.executeAgent(mockUserId, mockFilePath, mockOptions),
    ).rejects.toThrow('Graph build error');

    expect(processingRunRepo.update).toHaveBeenCalledWith(
      { threadId: mockThreadId },
      { status: 'failed' },
    );
  });

  it('should dismiss a job application when job_evaluator reports dismissedJobsCount', async () => {
    const mockJobs = [{ id: 1, url: 'job1' }] as any;
    pdfService.extractTextContent.mockResolvedValue('cv text');
    jobsService.fetchJobs.mockResolvedValue(mockJobs);
    processingRunRepo.findOneBy.mockResolvedValue(null);
    processingRunRepo.create.mockImplementation((dto) => dto as any);

    const mockAgent = {
      stream: jest.fn(),
    };
    langgraphService.build.mockResolvedValue(mockAgent as any);

    async function* mockStream() {
      yield {
        job_supplier: { job: mockJobs[0], cvEntityId: 100 },
      } as StreamChunk;
      yield {
        job_evaluator: {
          cvEntityId: 100,
          evaluatedJobsCount: 1,
          dismissedJobsCount: 1,
          isValidJob: false,
          evaluationResult: JobEvaluationDecision.DISMISS,
          url: 'job1',
        },
      } as StreamChunk;
    }

    mockAgent.stream.mockResolvedValue(mockStream());
    applicationRepo.findOne.mockResolvedValue({ id: 10 } as any);

    await service.executeAgent(mockUserId, mockFilePath, mockOptions);

    expect(applicationRepo.update).toHaveBeenCalledWith(10, {
      evaluationResult: JobEvaluationDecision.DISMISS,
    });
    expect(applicationRepo.update).toHaveBeenCalledWith(10, {
      status: 'dismissed',
    });
    expect(processingRunRepo.update).toHaveBeenCalledWith(
      { threadId: mockThreadId },
      { evaluatedJobApplications: 1, dismissedJobApplications: 1 },
    );
  });

  it.each([5, 6])(
    'skips when %i completed apply results already meet the target',
    async (count) => {
      pdfService.extractTextContent.mockResolvedValue('cv text');
      cvRepo.findOneBy.mockResolvedValue({ id: 100 } as Cv);
      applicationRepo.countBy.mockResolvedValue(count);

      await service.executeAgent(mockUserId, mockFilePath, mockOptions);

      expect(cvRepo.findOneBy).toHaveBeenCalledWith({
        hash: 'e5200f3ea90c0b8c81e93a59ab9bbe81',
      });
      expect(applicationRepo.countBy).toHaveBeenCalledWith({
        userId: mockUserId,
        cv: { id: 100 },
        evaluationResult: JobEvaluationDecision.APPLY,
        status: 'applied',
      });
      expect(jobsService.fetchJobs).toHaveBeenCalledWith(true, true);
      expect(jobsService.filterOutProcessedJobs).not.toHaveBeenCalled();
      expect(langgraphService.build).not.toHaveBeenCalled();
      expect(applicationRepo.save).not.toHaveBeenCalled();
      expect(processingRunRepo.findOneBy).not.toHaveBeenCalled();
      expect(processingRunRepo.save).not.toHaveBeenCalled();
      expect(processingRunRepo.update).toHaveBeenCalledWith(
        { threadId: mockThreadId },
        { status: 'skipped' },
      );
    },
  );

  it.each([0, 1])(
    'processes remaining jobs when there are %i previous apply results',
    async (count) => {
      const fetchedJobs = [{ url: 'old' }, { url: 'new' }];
      const remainingJobs = [{ url: 'new' }];
      pdfService.extractTextContent.mockResolvedValue('cv text');
      cvRepo.findOneBy.mockResolvedValue({ id: 100 } as Cv);
      applicationRepo.countBy.mockResolvedValue(count);
      jobsService.fetchJobs.mockResolvedValue(fetchedJobs);
      jobsService.filterOutProcessedJobs.mockResolvedValue(remainingJobs);
      processingRunRepo.findOneBy.mockResolvedValue({
        threadId: mockThreadId,
      } as JobApplicationProcessingRun);
      const agent = {
        stream: jest.fn().mockResolvedValue(
          (async function* () {
            yield* [];
          })(),
        ),
      };
      langgraphService.build.mockResolvedValue(
        agent as unknown as Awaited<ReturnType<LanggraphService['build']>>,
      );

      await service.executeAgent(mockUserId, mockFilePath, mockOptions);

      expect(jobsService.filterOutProcessedJobs).toHaveBeenCalledWith(
        mockUserId,
        100,
        fetchedJobs,
      );
      expect(agent.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          jobs: remainingJobs,
          maxAppliedJobs: 5 - count,
        }),
        expect.anything(),
      );
    },
  );

  it('skips when no fetched jobs remain after filtering', async () => {
    pdfService.extractTextContent.mockResolvedValue('cv text');
    cvRepo.findOneBy.mockResolvedValue({ id: 100 } as Cv);
    applicationRepo.countBy.mockResolvedValue(1);
    jobsService.fetchJobs.mockResolvedValue([{ url: 'old' }]);
    jobsService.filterOutProcessedJobs.mockResolvedValue([]);

    await service.executeAgent(mockUserId, mockFilePath, mockOptions);

    expect(langgraphService.build).not.toHaveBeenCalled();
    expect(processingRunRepo.update).toHaveBeenCalledWith(
      { threadId: mockThreadId },
      { status: 'skipped' },
    );
  });

  it('should update existing processing run if it exists', async () => {
    const mockJobs = [] as any;
    pdfService.extractTextContent.mockResolvedValue('cv text');
    jobsService.fetchJobs.mockResolvedValue(mockJobs);

    processingRunRepo.findOneBy.mockResolvedValue({
      threadId: mockThreadId,
    } as any);

    const mockAgent = {
      stream: jest.fn().mockResolvedValue(
        (async function* () {
          yield* [];
        })(),
      ),
    };
    langgraphService.build.mockResolvedValue(mockAgent as any);

    await service.executeAgent(mockUserId, mockFilePath, mockOptions);

    expect(processingRunRepo.update).toHaveBeenCalledWith(
      { threadId: mockThreadId },
      expect.objectContaining({ status: 'in progress' }),
    );
    expect(processingRunRepo.save).not.toHaveBeenCalled();
  });

  it('should not fail if application is not found when processing chunks', async () => {
    const mockJobs = [{ id: 1, url: 'job1' }] as any;
    pdfService.extractTextContent.mockResolvedValue('cv text');
    jobsService.fetchJobs.mockResolvedValue(mockJobs);
    processingRunRepo.findOneBy.mockResolvedValue(null);
    processingRunRepo.create.mockImplementation((dto) => dto as any);

    const mockAgent = {
      stream: jest.fn(),
    };
    langgraphService.build.mockResolvedValue(mockAgent as any);

    async function* mockStream() {
      yield {
        job_evaluator: { cvEntityId: 100, dismissedJobsCount: 1, url: 'job1' },
      } as StreamChunk;
      yield {
        cover_letter_generator: {
          cvEntityId: 100,
          appliedJobsCount: 1,
          url: 'job1',
          coverLetters: { url: 'job1', coverLetter: 'cl1' },
        },
      } as StreamChunk;
    }

    mockAgent.stream.mockResolvedValue(mockStream());
    applicationRepo.findOne.mockResolvedValue(null); // Not found

    await service.executeAgent(mockUserId, mockFilePath, mockOptions);

    // Should still update the processing run
    expect(processingRunRepo.update).toHaveBeenCalledWith(
      { threadId: mockThreadId },
      { dismissedJobApplications: 1 },
    );
    expect(processingRunRepo.update).toHaveBeenCalledWith(
      { threadId: mockThreadId },
      { appliedJobApplications: 1 },
    );

    // But not the applications
    expect(applicationRepo.update).not.toHaveBeenCalled();
  });
});
