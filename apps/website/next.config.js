/** @type {import('next').NextConfig} */

const path = require('path');

const nextConfig = {
  output: 'standalone',
  // Needed so Next.js traces dependencies from the monorepo root
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

module.exports = nextConfig;
