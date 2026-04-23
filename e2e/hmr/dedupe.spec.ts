import { test, expect } from './fixtures/vite-server'
import type { Page } from '@playwright/test'

/**
 * Regression for https://github.com/posva/pinia-colada/issues/569
 *
 * Mounting the same component across separate ticks (v-for populated from an
 * async loop) used to trigger N fetches in dev because the HMR heuristic
 * treated every new instance as if the component had been hot-updated. With
 * the fix, all instances share the in-flight request.
 */

test.describe('dedupe (issue #569)', () => {
  let hmrToken: number = -1

  test.beforeEach(() => {
    hmrToken = -1
  })

  async function ensureHmrToken(page: Page) {
    hmrToken = await page.evaluate(() => (window.__hmrToken ??= Math.random()))
  }

  test.afterEach(async ({ page }) => {
    if (hmrToken === -1) {
      throw new Error('hmrToken was not set in the test')
    }
    await expect.poll(async () => page.evaluate(() => window.__hmrToken)).toBe(hmrToken)
  })

  test('shares the in-flight request across staggered mounts', async ({
    page,
    baseURL,
    applyEditFile,
  }) => {
    await page.goto(baseURL + '/?scenario=dedupe')
    await ensureHmrToken(page)

    // wait for all 7 Child instances to be mounted across ticks
    await expect.poll(async () => page.evaluate(() => window.__itemsMounted)).toBe(7)

    // wait for the shared query to resolve
    await expect(page.getByTestId('child').first()).toContainText('a,b,c')

    expect(await page.evaluate(() => window.__fetchCount)).toBe(1)

    // swap Child.vue with an edited version — this fires a real HMR update
    applyEditFile('src/scenarios/Child.vue', 'edits/src/scenarios/Child-v2.vue')

    // wait for the shared query to resolve
    await expect(page.getByTestId('child').first()).toContainText('x,y,z')
    expect(await page.evaluate(() => window.__fetchCount)).toBe(2)
  })
})
