import linkedIn, { LinkedInJob } from 'linkedin-jobs-api';
import { Injectable } from '@nestjs/common';
import { cleanHtml } from '../jobs.utils';
import * as cheerio from 'cheerio';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from '@apps/shared';
import { Repository } from 'typeorm';
import { Between } from 'typeorm';
import { createLogger } from '@apps/shared';

@Injectable()
export class LinkedinService {
  private readonly logger = createLogger('linkedin-service');

  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
  ) {}

  async fetchJobs(): Promise<Omit<Job, 'id'>[]> {
    this.logger.info('Fetching jobs from linkedin...');
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date();
    end.setUTCHours(23, 59, 59, 999);

    const fetchedJobs = await this.jobRepository.find({
      where: {
        createdAt: Between(start, end),
        source: 'linkedin',
      },
    });

    if (fetchedJobs.length > 0) {
      return fetchedJobs;
    } else {
      const { default: pMap } = await import(/* webpackIgnore: true */ 'p-map');
      const linkedinJobs: LinkedInJob[] = await linkedIn.query({
        location: 'Prague',
        dateSincePosted: '24hr',
        remoteFilter: 'remote',
        limit: '100',
        page: '0',
        has_verification: false,
        under_10_applicants: false,
      });

      const jobUrls = linkedinJobs.map((job) => job.jobUrl);

      const descriptions = await pMap(
        jobUrls,
        (url) => this.fetchJobDescription(url),
        {
          concurrency: 3,
        },
      );

      const jobs: Omit<Job, 'id'>[] = linkedinJobs.map((job, index) => ({
        url: job.jobUrl,
        title: job.position,
        company: job.company,
        source: 'linkedin',
        description: descriptions[index] || '',
        createdAt: new Date(),
      }));

      const insertResult = await this.jobRepository.upsert(jobs, {
        conflictPaths: ['url'],
      });

      this.logger.debug(
        `Saved ${insertResult.generatedMaps.length} new jobs from linkedin`,
      );
      return jobs;
    }
  }

  private async fetchJobDescription(url: string) {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua':
          '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Upgrade-Insecure-Requests': '1',
      },
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    const descriptionElement = $('.description__text').first();
    const description = cleanHtml(descriptionElement.html() || '');
    return description;
  }
}
