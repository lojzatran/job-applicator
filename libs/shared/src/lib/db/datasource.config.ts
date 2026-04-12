import { JobApplication } from '../entities/job-application.entity';
import { Cv } from '../entities/cv.entity';
import { DataSourceOptions } from 'typeorm';
import { env } from '../utils/env';
import { JobApplicationProcessingRun } from '../entities/job-application-processing-run.entity';

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
  logging: ['error'],
  entities: [JobApplication, Cv, JobApplicationProcessingRun],
  subscribers: [],
  migrations: [],
} as DataSourceOptions;
