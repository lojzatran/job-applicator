import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

loadDotenv({ path: resolve(process.cwd(), '.env') });

const migrationDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: false,
  logging: true,
  entities: [resolve(process.cwd(), 'libs/shared/src/lib/entities/**/*{.ts,.js}')],
  subscribers: [],
  migrations: [resolve(process.cwd(), 'libs/migrations/**/*{.ts,.js}')],
});

export default migrationDataSource;
