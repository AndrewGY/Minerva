/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable TypeScript checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint checking during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configure output for deployment
  output: 'standalone',
  // Disable static optimization for pages that use dynamic features
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

module.exports = nextConfig; 