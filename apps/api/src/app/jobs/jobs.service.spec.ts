import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Job, JobApplication } from '@apps/shared';
import { Repository } from 'typeorm';
import { JobsService } from './jobs.service';
import { LinkedinService } from './linkedin/linkedin.service';
import { StartupJobsService } from './startupjobs/startupjobs.service';

describe('JobsService', () => {
  let service: JobsService;
  let linkedinService: jest.Mocked<LinkedinService>;
  let startupjobsService: jest.Mocked<StartupJobsService>;
  let jobApplicationRepository: jest.Mocked<Repository<JobApplication>>;

  const asJobs = (jobs: Partial<Job>[]) => jobs as Job[];

  beforeEach(async () => {
    const mockLinkedinService = {
      fetchJobs: jest.fn(),
    };

    const mockStartupJobsService = {
      fetchJobs: jest.fn(),
    };

    const mockJobApplicationRepository = {
      save: jest.fn(),
      find: jest.fn(),
      manager: {
        query: jest.fn(),
      },
      metadata: {
        tableName: 'job_application',
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: LinkedinService,
          useValue: mockLinkedinService,
        },
        {
          provide: StartupJobsService,
          useValue: mockStartupJobsService,
        },
        {
          provide: getRepositoryToken(JobApplication),
          useValue: mockJobApplicationRepository,
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    linkedinService = module.get(
      LinkedinService,
    ) as jest.Mocked<LinkedinService>;
    startupjobsService = module.get(
      StartupJobsService,
    ) as jest.Mocked<StartupJobsService>;
    jobApplicationRepository = module.get(
      getRepositoryToken(JobApplication),
    ) as jest.Mocked<Repository<JobApplication>>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch jobs from linkedin and startupjobs when both are enabled', async () => {
    const mockLinkedinJobs: Partial<Job>[] = [{ id: 1, source: 'linkedin' }];
    const mockStartupJobs: Partial<Job>[] = [{ id: 2, source: 'startupjobs' }];

    linkedinService.fetchJobs.mockResolvedValue(asJobs(mockLinkedinJobs));
    startupjobsService.fetchJobs.mockResolvedValue(asJobs(mockStartupJobs));

    const result = await service.fetchJobs(true, true);

    expect(linkedinService.fetchJobs).toHaveBeenCalledTimes(1);
    expect(startupjobsService.fetchJobs).toHaveBeenCalledTimes(1);
    expect(result).toEqual([...mockLinkedinJobs, ...mockStartupJobs]);
  });

  it('should fetch jobs from linkedin only when linkedin is enabled and startupjobs is disabled', async () => {
    const mockLinkedinJobs: Partial<Job>[] = [{ id: 1, source: 'linkedin' }];

    linkedinService.fetchJobs.mockResolvedValue(asJobs(mockLinkedinJobs));

    const result = await service.fetchJobs(true, false);

    expect(linkedinService.fetchJobs).toHaveBeenCalledTimes(1);
    expect(startupjobsService.fetchJobs).not.toHaveBeenCalled();
    expect(result).toEqual([...mockLinkedinJobs]);
  });

  it('should fetch jobs from startupjobs only when startupjobs is enabled and linkedin is disabled', async () => {
    const mockStartupJobs: Partial<Job>[] = [{ id: 2, source: 'startupjobs' }];

    startupjobsService.fetchJobs.mockResolvedValue(asJobs(mockStartupJobs));

    const result = await service.fetchJobs(false, true);

    expect(linkedinService.fetchJobs).not.toHaveBeenCalled();
    expect(startupjobsService.fetchJobs).toHaveBeenCalledTimes(1);
    expect(result).toEqual([...mockStartupJobs]);
  });

  it('should not fetch jobs when both are disabled', async () => {
    const result = await service.fetchJobs(false, false);

    expect(linkedinService.fetchJobs).not.toHaveBeenCalled();
    expect(startupjobsService.fetchJobs).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  describe('removeProcessedJobs', () => {
    it('should return all jobs when no processed applications exist', async () => {
      const jobs: Partial<Job>[] = [
        { url: 'https://example.com/job1' },
        { url: 'https://example.com/job2' },
      ];

      jobApplicationRepository.find.mockResolvedValue([]);

      const result = await service.filterOutJobsWithApplications(
        'user-1',
        jobs,
      );

      expect(jobApplicationRepository.find).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          job: {
            url: expect.any(Object),
          },
        },
        relations: ['job'],
      });
      expect(result).toEqual(jobs);
    });

    it('should remove jobs that have been applied or dismissed', async () => {
      const jobs: Partial<Job>[] = [
        { url: 'https://example.com/job1' },
        { url: 'https://example.com/job2' },
        { url: 'https://example.com/job3' },
      ];

      const processedApplications = [
        {
          userId: 'user-1',
          status: 'applied',
          job: { url: 'https://example.com/job1' },
        },
        {
          userId: 'user-1',
          status: 'dismissed',
          job: { url: 'https://example.com/job3' },
        },
      ];

      jobApplicationRepository.find.mockResolvedValue(
        processedApplications as JobApplication[],
      );

      const result = await service.filterOutJobsWithApplications(
        'user-1',
        jobs,
      );

      expect(result).toEqual([{ url: 'https://example.com/job2' }]);
    });

    it('should return empty array when all jobs are processed', async () => {
      const jobs: Partial<Job>[] = [{ url: 'https://example.com/job1' }];

      const processedApplications = [
        {
          userId: 'user-1',
          status: 'applied',
          job: { url: 'https://example.com/job1' },
        },
      ];

      jobApplicationRepository.find.mockResolvedValue(
        processedApplications as JobApplication[],
      );

      const result = await service.filterOutJobsWithApplications(
        'user-1',
        jobs,
      );

      expect(result).toEqual([]);
    });
  });
});
