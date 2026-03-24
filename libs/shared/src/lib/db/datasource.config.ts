import { JobApplication } from '../entities/job-application.entity';
import { DataSourceOptions } from 'typeorm';
import { env } from '../utils/env';

export const dataSourceOptions = {
  type: 'postgres',
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  username: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
  synchronize: true,
  logging: true,
  entities: [JobApplication],
  subscribers: [],
  migrations: [],
} as DataSourceOptions;
