import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '@apps/shared';

export const AppDataSource = new DataSource(dataSourceOptions);
