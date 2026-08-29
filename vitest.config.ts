import { defineConfig } from 'vitest/config';

// Standalone test config (no PWA/Tailwind plugins) so smoke tests run fast.
// Tests are excluded from the production tsc build via tsconfig.app.json.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    // Threads, NOT forks. On the UNC share the forks pool intermittently fails
    // to start workers ("Timeout waiting for worker to respond") and vitest then
    // reports the SURVIVING files as a full pass — e.g. "Test Files 12 passed
    // (12)" while 3 files never ran at all. That false green is how unverified
    // code shipped on 2026-08-15. Threads has no such startup failure here.
    // If you ever change this, verify the run reports 15 files / 250+ tests.
    pool: 'threads',
  },
});
