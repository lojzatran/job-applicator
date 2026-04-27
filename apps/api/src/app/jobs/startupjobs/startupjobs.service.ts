import { Injectable } from '@nestjs/common';
import { cleanHtml } from '../jobs.utils';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from '@apps/shared';
import { Repository } from 'typeorm';
import { Between } from 'typeorm';
import { createLogger } from '@apps/shared';

type StartupJobsLocalizedValue = {
  cs: string | null;
  en?: string | null;
};

type StartupJobsResource = {
  '@id': string;
  '@type': string;
  id: string;
};

type StartupJobsCompany = StartupJobsResource & {
  name: string;
  slug: string;
  logo: string | null;
  isStartup: boolean;
};

type StartupJobsBenefit = StartupJobsResource & {
  name: StartupJobsLocalizedValue;
  slug: StartupJobsLocalizedValue;
};

type StartupJobsGeoPoint = {
  '@id': string;
  '@type': 'ElasticGeopoint';
  lat: number;
  lon: number;
};

type StartupJobsLocation = StartupJobsResource & {
  point: StartupJobsGeoPoint;
  name: StartupJobsLocalizedValue;
  type: string;
};

type StartupJobsSalaryRange = {
  minimum: string | null;
  maximum: string | null;
};

type StartupJobsInferredSalary = {
  hour: Record<string, StartupJobsSalaryRange>;
  month: Record<string, StartupJobsSalaryRange>;
  year: Record<string, StartupJobsSalaryRange>;
};

type StartupJobsSalary = {
  minimum: {
    amount: string;
    currency: string;
  } | null;
  maximum: {
    amount: string;
    currency: string;
  } | null;
  unit: string;
  inferredSalary: StartupJobsInferredSalary;
};

type StartupJobsSkill = StartupJobsResource & {
  name: string;
  slug: string;
  type: string;
};

type StartupJobsLanguage = StartupJobsResource & {
  name: StartupJobsLocalizedValue;
  slug: StartupJobsLocalizedValue;
};

type StartupJobsField = StartupJobsResource & {
  parent?: StartupJobsLocalizedValue;
  name: StartupJobsLocalizedValue;
  slug: StartupJobsLocalizedValue;
  isMain: boolean;
  isTopped: boolean;
};

export type StartupJobsOffer = {
  '@id': string;
  '@type': 'SearchOffer';
  id: string;
  displayId: number;
  kind: string;
  company: StartupJobsCompany;
  contract: string[];
  seniority: string[];
  title: StartupJobsLocalizedValue;
  description: StartupJobsLocalizedValue;
  boostedAt: string | null;
  isHot: boolean;
  isStartup: boolean;
  benefits: StartupJobsBenefit[];
  locations: StartupJobsLocation[];
  locationPreference: string[];
  employmentType: string[];
  salary?: StartupJobsSalary;
  skills: StartupJobsSkill[];
  languages: StartupJobsLanguage[];
  fields: StartupJobsField[];
  slug: string;
};

type StartupJobsCollectionView = {
  '@id': string;
  '@type': 'PartialCollectionView';
  first: string;
  last: string;
  next?: string;
  previous?: string;
};

type StartupJobsIriTemplateMapping = {
  '@type': 'IriTemplateMapping';
  variable: string;
  property: string;
  required: boolean;
};

type StartupJobsSearchTemplate = {
  '@type': 'IriTemplate';
  template: string;
  variableRepresentation: string;
  mapping: StartupJobsIriTemplateMapping[];
};

export type StartupJobsSearchOffersResponse = {
  '@context': string;
  '@id': string;
  '@type': 'Collection';
  totalItems: number;
  member: StartupJobsOffer[];
  view: StartupJobsCollectionView;
  search: StartupJobsSearchTemplate;
};

@Injectable()
export class StartupJobsService {
  private readonly logger = createLogger('startupjobs-service');

  // This is fixed limit by startupjobs.cz
  private LIMIT = 20;

  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
  ) {}

  async fetchJobs(): Promise<Omit<Job, 'id'>[]> {
    this.logger.info('Fetching jobs from startupjobs.cz...');
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date();
    end.setUTCHours(23, 59, 59, 999);

    const fetchedJobs = await this.jobRepository.find({
      where: {
        createdAt: Between(start, end),
        source: 'startupjobs',
      },
    });

    if (fetchedJobs.length > 0) {
      this.logger.debug(
        `Already fetched ${fetchedJobs.length} jobs from startupjobs.cz today`,
      );
      return fetchedJobs;
    }

    this.logger.debug(
      `No jobs fetched from startupjobs.cz today, fetching all jobs from startupjobs.cz`,
    );

    const response = await fetch(
      `https://core.startupjobs.cz/api/search/offers?page=1&startupOnly=false&locationPreference%5B%5D=remote`,
    );

    const firstPage: StartupJobsSearchOffersResponse =
      (await response.json()) as StartupJobsSearchOffersResponse;

    const totalPages = Math.ceil(firstPage.totalItems / this.LIMIT) - 1; // subtract 1 because we already fetched the first page above
    const { default: pMap } = await import(/* webpackIgnore: true */ 'p-map');

    const otherPages = await pMap(
      Array.from({ length: totalPages }, (_, i) => i + 2),
      async (pageNumber) => {
        const response = await fetch(
          `https://core.startupjobs.cz/api/search/offers?page=${pageNumber}&startupOnly=false&locationPreference%5B%5D=remote`,
        );
        const data: StartupJobsSearchOffersResponse =
          (await response.json()) as StartupJobsSearchOffersResponse;
        return data.member;
      },
      { concurrency: 3 },
    );

    const allStartupJobs: StartupJobsOffer[] = [
      ...firstPage.member,
      ...otherPages.flat(),
    ];

    this.logger.debug(
      `Fetched ${allStartupJobs.length} jobs from startupjobs.cz`,
    );

    const jobs = allStartupJobs.map((job) => ({
      title: job.title.en || job.title.cs || '',
      description: cleanHtml(job.description.en || job.description.cs || ''),
      company: job.company.name,
      url: `https://www.startupjobs.cz/nabidka/${job.displayId}/${job.slug}`,
      source: 'startupjobs',
      createdAt: new Date(),
    }));

    const insertResult = await this.jobRepository.upsert(jobs, {
      conflictPaths: ['url'],
    });
    this.logger.debug(
      `Saved ${insertResult.generatedMaps.length} new jobs from startupjobs.cz`,
    );
    return jobs;
  }
}
