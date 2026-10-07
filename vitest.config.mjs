import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['test/unit/**/*.test.{js,jsx}'],
    environment: 'node',
    restoreMocks: true,
    clearMocks: true,
  },
});
