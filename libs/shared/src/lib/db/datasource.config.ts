import { JobApplication } from '../entities/job-application.entity';
import { Cv } from '../entities/cv.entity';
import { DataSourceOptions } from 'typeorm';
import { env } from '../utils/env';
import { JobApplicationProcessingRun } from '../entities/job-application-processing-run.entity';
import { Job } from '../entities/job.entity';

export const postgresConnectionOptions = {
  type: 'postgres',
  schema: 'public',
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  username: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
};

export const dataSourceOptions = {
  ...postgresConnectionOptions,
  synchronize: false,
  logging: [
    'error',
    ...(env.NODE_ENV === 'development' ? (['query'] as const) : []),
  ],
  logger:
    env.NODE_ENV === 'development' ? 'formatted-console' : 'advanced-console',
  entities: [JobApplication, Cv, Job, JobApplicationProcessingRun],
  subscribers: [],
  migrations: [],
} as DataSourceOptions;
