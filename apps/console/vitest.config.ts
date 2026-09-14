import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Vitest transforms `.tsx` with esbuild, the same way `packages/ui` already
  // does. The React plugin is deliberately absent: a test run must not depend
  // on the dev-server toolchain to compile a component.
  esbuild: { jsx: 'automatic' },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Server tests are the default. A client test opts in with
    // `// @vitest-environment jsdom` on its first line — one line per file, and
    // unlike `environmentMatchGlobs` it survives the vitest 2 → 3 rename.
    environment: 'node',
  },
});
