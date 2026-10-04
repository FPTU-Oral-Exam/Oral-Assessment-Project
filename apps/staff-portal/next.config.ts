import type { NextConfig } from 'next';
import { existsSync } from 'fs';

const isDocker = existsSync('/.dockerenv');
const defaultApi = isDocker ? 'http://api:8000' : 'http://127.0.0.1:8000';
const apiTarget = process.env.API_INTERNAL_URL || defaultApi;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@oralai/shared'],
  typescript: {
    ignoreBuildErrors: false,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
