import linkedIn, { LinkedInJob } from 'linkedin-jobs-api';
import { Injectable } from '@nestjs/common';
import { Job } from '../types';
import { cleanHtml } from '../jobs.utils';
import * as cheerio from 'cheerio';

@Injectable()
export class LinkedinService {
  async fetchJobs(): Promise<Job[]> {
    const { default: pMap } = await import(/* webpackIgnore: true */ 'p-map');
    const jobs: LinkedInJob[] = await linkedIn.query({
      location: 'Prague',
      dateSincePosted: '24hr',
      remoteFilter: 'remote',
      limit: '100',
      page: '0',
      has_verification: false,
      under_10_applicants: false,
    });

    const jobUrls = jobs.map((job) => job.jobUrl);

    const descriptions = await pMap(
      jobUrls,
      (url) => this.fetchJobDescription(url),
      {
        concurrency: 3,
      },
    );

    const jobsWithDescription: Job[] = jobs.map((job, index) => ({
      id: job.jobUrl,
      title: job.position,
      company: job.company,
      url: job.jobUrl,
      description: descriptions[index] || '',
    }));

    return jobsWithDescription;
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
    if (url.includes('4387835920')) {
      console.log('Description element:', descriptionElement.html());
      console.log('URL:', url);
      console.log('Description:', description);
    }
    return description;
  }
}
