import { defineConfig } from 'vitest/config';

// Jedan Vitest za ceo monorepo. Paket može da doda svoj vitest.config.ts
// ako mu treba posebno okruženje (npr. apps/web sa jsdom).
export default defineConfig({
  test: {
    include: ['{apps,packages}/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    passWithNoTests: true,
  },
});
