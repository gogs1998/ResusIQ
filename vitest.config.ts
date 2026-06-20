import { defineConfig } from 'vitest/config';

// Standalone test config (no PWA/Tailwind plugins) so smoke tests run fast.
// Tests are excluded from the production tsc build via tsconfig.app.json.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
