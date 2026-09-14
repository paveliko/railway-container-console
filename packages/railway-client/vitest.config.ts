import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `live.test.ts` is the only test that would talk to Railway. It is not in
    // the default run at all — it has its own task, `test:live`, which is
    // uncached and absent from CI (design §5, §7; V-MW-23).
    include: ['src/**/*.test.ts'],
    exclude: ['src/live.test.ts'],
    environment: 'node',
  },
});
