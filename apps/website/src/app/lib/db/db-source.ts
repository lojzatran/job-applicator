import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '@apps/shared';

export const AppDataSource = new DataSource(dataSourceOptions);

let appDataSourceInitialization: Promise<typeof AppDataSource> | null = null;

export async function getAppDataSource(): Promise<typeof AppDataSource> {
  if (AppDataSource.isInitialized) {
    return AppDataSource;
  }

  if (!appDataSourceInitialization) {
    appDataSourceInitialization = AppDataSource.initialize();
  }

  try {
    return await appDataSourceInitialization;
  } catch (error) {
    appDataSourceInitialization = null;
    throw error;
  }
}
