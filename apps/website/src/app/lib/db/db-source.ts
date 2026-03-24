import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { JobApplication } from '@apps/shared';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'job_applicator',
  synchronize: true,
  logging: true,
  entities: [JobApplication],
  subscribers: [],
  migrations: [],
});
