import type { NextConfig } from 'next';

/**
 * Nothing clever here on purpose. The console is one page and four routes;
 * the interesting constraints live in the route handlers (Node runtime, see
 * the parent change's design §10), not in the build.
 *
 * The one line that matters is `transpilePackages`: the workspace packages are
 * consumed Just-in-Time — their `exports` point at TypeScript sources and there
 * is no `dist/` — so Next.js compiles them as part of this app. `D-OPS-3`.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@repo/contracts',
    '@repo/container-core',
    '@repo/railway-client',
    '@repo/ui',
  ],
};

export default nextConfig;
