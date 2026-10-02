import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@oralai/shared'],
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
