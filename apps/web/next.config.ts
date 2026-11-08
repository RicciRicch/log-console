import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Paketi iz monorepa su TypeScript izvor, Next ih prevodi sam
  transpilePackages: ['@konzola/shared'],
  poweredByHeader: false,
};

export default nextConfig;
