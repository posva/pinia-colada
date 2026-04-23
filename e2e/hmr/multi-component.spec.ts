import type { Page } from '@playwright/test'
import { expect, test } from './fixtures/vite-server'

/**
 * Two different components sharing the same query key must not invalidate
 * each other's entry during a plain remount/mount mix. With a single
 * `{ setup, render }` snapshot stored on the entry, alternating mounts of
 * distinct component types were each treated as a hot-update and cancelled
 * the shared in-flight request. The snapshot needs to be keyed by
 * `__hmrId`.
 */

test.describe('multi-component shared key', () => {
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

  test('shares the in-flight request across distinct components', async ({ page, baseURL }) => {
    await page.goto(baseURL + '/?scenario=multi')
    await ensureHmrToken(page)

    // wait for all staggered mounts (5 alternating A/B instances)
    await expect.poll(async () => page.evaluate(() => window.__itemsMounted)).toBe(5)

    // wait for the shared query to resolve
    await expect(page.getByTestId('child').first()).toContainText('a,b,c')

    expect(await page.evaluate(() => window.__fetchCount)).toBe(1)
  })
})
