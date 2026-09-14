import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The client half of the console, and only the client half. The server is not
 * built: it is TypeScript that `tsx` runs directly, exactly as the workspace
 * packages are TypeScript that Vite reads directly. `D-OPS-4`.
 *
 * The four `@repo/*` packages need no configuration here. Their `exports` maps
 * point at `src/index.ts`, pnpm symlinks them, and Vite resolves and transforms
 * linked TypeScript without being told to — so there are no aliases, and no
 * `optimizeDeps.exclude` either, because Vite already keeps linked workspace
 * dependencies out of pre-bundling.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    // Insurance rather than a fix: today every package resolves to the same
    // physical React. If that ever stops being true, two copies is an
    // invalid-hook-call at runtime, and this is the line that prevents it.
    dedupe: ['react', 'react-dom'],
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // `V-15` greps the built assets for the Railway host and for a sentinel
    // token. A source map makes that grep an inspection rather than a search
    // through minified soup.
    sourcemap: true,
  },

  // Deliberately absent: `define`, and any widening of `envPrefix`. Vite exposes
  // only `VITE_*` to the browser and the console has none, so no `RAILWAY_*`
  // value can reach a chunk by accident. That is not on its own a proof — the
  // boundary checker's client-graph walk and the grep of the built files are
  // the other two thirds of `V-15`.
});
