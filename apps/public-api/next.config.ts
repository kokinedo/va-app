import { type NextConfig } from 'next/types';
import withBundleAnalyzer from '@next/bundle-analyzer';

const INTERNAL_PACKAGES = [
  '@workspace/api-keys',
  '@workspace/common',
  '@workspace/database'
];

const nextConfig: NextConfig = {
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: INTERNAL_PACKAGES,
  serverExternalPackages: [],
  experimental: {
    optimizePackageImports: INTERNAL_PACKAGES,
    turbo: {
      treeShaking: true
    }
  },
  reactStrictMode: false,
  poweredByHeader: false
};

const bundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.BUNDLE_ANALYZER === 'true'
});

export default bundleAnalyzerConfig(nextConfig);
