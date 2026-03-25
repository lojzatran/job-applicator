// This data source is used for migrations command only
// npx typeorm migration:run -d migration-data-source.cjs

process.env.TS_NODE_TRANSPILE_ONLY = 'true';
process.env.TS_NODE_SKIP_PROJECT = 'true';
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'commonjs',
  moduleResolution: 'node',
  target: 'es2022',
  experimentalDecorators: true,
  emitDecoratorMetadata: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
});

require('ts-node/register/transpile-only');

const {
  dataSourceOptions,
} = require('../shared/src/lib/db/datasource.config.ts');

const { config: loadDotenv } = require('dotenv');
const { resolve } = require('path');
const { DataSource } = require('typeorm');

loadDotenv({ path: resolve(process.cwd(), '.env') });

const migrationDataSource = new DataSource({
  ...dataSourceOptions,
  migrations: [resolve(process.cwd(), 'libs/migrations/**/*{.ts,.js}')],
});

module.exports.default = migrationDataSource;
