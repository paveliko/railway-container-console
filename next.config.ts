import type { NextConfig } from 'next';

/**
 * Nothing clever here on purpose. The console is one page and four routes;
 * the interesting constraints live in the route handlers (Node runtime, see
 * design.md §10), not in the build.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
