import { defineConfig } from 'vitest/config';

// Small opt-in Leave checks; does not start Angular/Nx or build the application.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['apps/admin/src/app/pages/workforce/leave.service.spec.ts'],
    maxWorkers: 1,
    fileParallelism: false,
  },
});
