import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Job } from '@apps/shared';
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
  let mockJobRepository: {
    find: jest.Mock;
    insert: jest.Mock;
    upsert: jest.Mock;
  };

  beforeEach(async () => {
    mockJobRepository = {
      find: jest.fn(),
      insert: jest.fn(),
      upsert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartupJobsService,
        {
          provide: getRepositoryToken(Job),
          useValue: mockJobRepository,
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
    mockJobRepository.find.mockResolvedValue([]);
    mockJobRepository.upsert.mockResolvedValue({
      identifiers: [],
      generatedMaps: [],
      raw: [],
    });

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      const data = url.includes('/api/offers/')
        ? { description: { cs: '<p class="description">Popis nabídky</p>' } }
        : {
            ...mockResponse,
            member: mockResponse.member.map((offer) => ({
              id: offer.displayId,
              name: offer.title,
              slug: { cs: offer.slug },
              company: offer.company,
            })),
          };
      return Promise.resolve({ json: jest.fn().mockResolvedValue(data) });
    });

    const jobs = await service.fetchJobs();

    // Six search pages and one detail request per offer.
    expect(global.fetch).toHaveBeenCalledTimes(
      6 + mockResponse.member.length * 6,
    );
    expect(jobs[0]).toMatchObject({
      title: mockResponse.member[0].title.cs,
      description: '<p>Popis nabídky</p>',
      url: `https://www.startupjobs.cz/nabidka/${mockResponse.member[0].displayId}/${mockResponse.member[0].slug}`,
    });

    // verify that all jobs are saved to db
    expect(mockJobRepository.upsert).toHaveBeenCalledTimes(1);
    const insertedJobs = mockJobRepository.upsert.mock.calls[0][0];
    expect(insertedJobs.length).toBe(jobs.length);
    expect(jobs.length).toBe(mockResponse.member.length * 6);
  });

  it('should load from db when jobs were already fetched', async () => {
    const currentDate = new Date('2026-04-05T12:00:00Z');

    // mock jobApplicationRepository
    const fakeJobs = [
      {
        id: '1',
        title: 'test',
        source: 'startupjobs',
        createdAt: currentDate,
      },
      {
        id: '2',
        title: 'test 2',
        source: 'startupjobs',
        createdAt: currentDate,
      },
    ];
    mockJobRepository.find.mockResolvedValue(fakeJobs);

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
    expect(mockJobRepository.find).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});
