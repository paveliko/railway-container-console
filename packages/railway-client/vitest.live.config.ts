import { defineConfig } from 'vitest/config';

/**
 * The one task that is allowed to reach Railway, and only when the five
 * `RAILWAY_*` variables are present in `.env.local` at the repository root.
 * Without them the suite skips itself; it is never cached and never in CI.
 */
export default defineConfig({
  test: { include: ['src/live.test.ts'], environment: 'node' },
});
