import { defineConfig, devices } from '@playwright/test'

export default defineConfig<{ playgroundName: string }>({
  testDir: './e2e/hmr',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'hmr',
      use: {
        ...devices['Desktop Chrome'],
        playgroundName: 'hmr',
      },
    },
  ],
})
