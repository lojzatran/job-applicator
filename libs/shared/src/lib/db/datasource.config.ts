import { JobApplication } from '../entities/job-application.entity';
import { DataSourceOptions } from 'typeorm';
import { env } from '../utils/env';

export const dataSourceOptions = {
  type: 'postgres',
  schema: 'public',
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  username: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
  synchronize: false,
  logging: ['error'],
  entities: [JobApplication],
  subscribers: [],
  migrations: [],
} as DataSourceOptions;
