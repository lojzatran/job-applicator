import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JobApplication } from '@apps/shared';
import { JobsService } from './jobs.service';
import { LinkedinService } from './linkedin/linkedin.service';
import { StartupJobsService } from './startupjobs/startupjobs.service';

describe('JobsService', () => {
  let service: JobsService;
  let linkedinService: jest.Mocked<LinkedinService>;
  let startupjobsService: jest.Mocked<StartupJobsService>;

  beforeEach(async () => {
    const mockLinkedinService = {
      fetchJobs: jest.fn(),
    };

    const mockStartupJobsService = {
      fetchJobs: jest.fn(),
    };

    const mockJobApplicationRepository = {
      save: jest.fn(),
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
    linkedinService = module.get(LinkedinService) as jest.Mocked<LinkedinService>;
    startupjobsService = module.get(StartupJobsService) as jest.Mocked<StartupJobsService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch jobs from linkedin and startupjobs when both are enabled', async () => {
    const mockLinkedinJobs: any[] = [{ id: '1', source: 'linkedin' }];
    const mockStartupJobs: any[] = [{ id: '2', source: 'startupjobs' }];
    
    linkedinService.fetchJobs.mockResolvedValue(mockLinkedinJobs);
    startupjobsService.fetchJobs.mockResolvedValue(mockStartupJobs);

    const result = await service.fetchJobs(true, true);

    expect(linkedinService.fetchJobs).toHaveBeenCalledTimes(1);
    expect(startupjobsService.fetchJobs).toHaveBeenCalledTimes(1);
    expect(result).toEqual([...mockLinkedinJobs, ...mockStartupJobs]);
  });

  it('should fetch jobs from linkedin only when linkedin is enabled and startupjobs is disabled', async () => {
    const mockLinkedinJobs: any[] = [{ id: '1', source: 'linkedin' }];
    
    linkedinService.fetchJobs.mockResolvedValue(mockLinkedinJobs);

    const result = await service.fetchJobs(true, false);

    expect(linkedinService.fetchJobs).toHaveBeenCalledTimes(1);
    expect(startupjobsService.fetchJobs).not.toHaveBeenCalled();
    expect(result).toEqual([...mockLinkedinJobs]);
  });

  it('should fetch jobs from startupjobs only when startupjobs is enabled and linkedin is disabled', async () => {
    const mockStartupJobs: any[] = [{ id: '2', source: 'startupjobs' }];
    
    startupjobsService.fetchJobs.mockResolvedValue(mockStartupJobs);

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
});
