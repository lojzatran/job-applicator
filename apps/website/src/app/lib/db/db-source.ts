import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '@apps/shared';

export const dataSource = new DataSource(dataSourceOptions);

let dataSourceInitialization: Promise<typeof dataSource> | null = null;

export async function getDataSource(): Promise<typeof dataSource> {
  if (dataSource.isInitialized) {
    return dataSource;
  }

  if (!dataSourceInitialization) {
    dataSourceInitialization = dataSource.initialize();
  }

  try {
    return await dataSourceInitialization;
  } catch (error) {
    dataSourceInitialization = null;
    throw error;
  }
}
