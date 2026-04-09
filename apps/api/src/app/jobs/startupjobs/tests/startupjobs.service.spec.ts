import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JobApplication } from '@apps/shared';
import { StartupJobsService } from '../startupjobs.service';
import * as mockResponse from './mocks/startupjobs-mock-response.json';

// p-map is a pure ESM module. We mock it here because Jest runs in a CommonJS
// environment by default and isn't configured to transform ESM within node_modules.
// Without this mock, the dynamic import() inside the service would throw a SyntaxError.
jest.mock(
  'p-map',
  () => {
    return async (items: any[], mapper: any) => {
      return Promise.all(items.map(mapper));
    };
  },
  { virtual: true },
);

describe('StartupJobsService', () => {
  let service: StartupJobsService;
  let mockJobApplicationRepository: { find: jest.Mock; insert: jest.Mock };

  beforeEach(async () => {
    mockJobApplicationRepository = {
      find: jest.fn(),
      insert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartupJobsService,
        {
          provide: getRepositoryToken(JobApplication),
          useValue: mockJobApplicationRepository,
        },
      ],
    }).compile();

    service = module.get<StartupJobsService>(StartupJobsService);

    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should fetch jobs from startupjobs.cz', async () => {
    // mock jobApplicationRepository
    mockJobApplicationRepository.find.mockResolvedValue([]);

    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    const jobs = await service.fetchJobs();

    // verify that it will make 6 requests in total
    expect(global.fetch).toHaveBeenCalledTimes(6);

    // verify that all jobs are saved to db
    expect(mockJobApplicationRepository.insert).toHaveBeenCalledTimes(1);
    const insertedJobs = mockJobApplicationRepository.insert.mock.calls[0][0];
    expect(insertedJobs.length).toBe(jobs.length);
    expect(jobs.length).toBe(mockResponse.member.length * 6);
  });

  it('should load from db when jobs were already fetched', async () => {
    const currentDate = new Date('2026-04-05T12:00:00Z');

    // mock jobApplicationRepository
    const fakeJobs = [
      {
        job: {
          id: '1',
          title: 'test',
          source: 'startupjobs',
          createdAt: currentDate,
        },
      },
      {
        job: {
          id: '2',
          title: 'test 2',
          source: 'startupjobs',
          createdAt: currentDate,
        },
      },
    ];
    mockJobApplicationRepository.find.mockResolvedValue(fakeJobs);

    // mock the date so that it will always be current date
    jest.useFakeTimers();
    jest.setSystemTime(currentDate);

    const jobs = await service.fetchJobs();

    // verify that it will make 0 requests in total
    expect(global.fetch).toHaveBeenCalledTimes(0);

    // verify that all jobs are loaded from db
    expect(jobs).toEqual([
      { id: '1', title: 'test', source: 'startupjobs', createdAt: currentDate },
      {
        id: '2',
        title: 'test 2',
        source: 'startupjobs',
        createdAt: currentDate,
      },
    ]);
    expect(mockJobApplicationRepository.find).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});
