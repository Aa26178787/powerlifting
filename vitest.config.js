import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.{js,jsx}'],
    environmentMatchGlobs: [
      ['src/ui/**', 'jsdom'],
    ],
    environment: 'node',
    setupFiles: ['src/test/setup.js'],
  },
})
