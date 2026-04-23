import { test, expect } from './fixtures/vite-server'
import type { Page } from '@playwright/test'

/**
 * Verifies that a real Vite HMR update to a component with an active query
 * still triggers a refetch. The previous unit-level test in
 * src/use-query.spec.ts only simulated HMR by setting a stable __hmrId and
 * remounting — it could not distinguish between HMR and a plain remount.
 *
 * The __hmrToken assertion proves the page didn't do a full reload: on a
 * genuine HMR update the window object is preserved.
 */

test.describe('HMR', () => {
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

  test('refetches when the component is hot-updated', async ({ page, baseURL, applyEditFile }) => {
    await page.goto(baseURL + '/?scenario=hmr')
    await ensureHmrToken(page)

    // initial fetch from the original Child.vue
    await expect(page.getByTestId('child')).toContainText('a,b,c')
    await expect.poll(async () => page.evaluate(() => window.__fetchCount)).toBe(1)

    // swap Child.vue with an edited version — this fires a real HMR update
    applyEditFile('src/scenarios/hmr/Child.vue', 'edits/src/scenarios/Child.vue')

    // the edited component uses the same key but a different body, so the
    // shared entry should be invalidated and refetched
    await expect(page.getByTestId('child')).toContainText('x,y,z')
    await expect.poll(async () => page.evaluate(() => window.__fetchCount)).toBe(2)
  })
})
