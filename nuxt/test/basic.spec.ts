import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, createPage, setup } from '@nuxt/test-utils/e2e'

describe('@pinia/colada-nuxt', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    browser: true,
  })

  it('renders the index page', async () => {
    const html = await $fetch('/')
    expect(html).toContain('<div>basic</div>')
    expect(html).toMatch(/<span data-query(?:="")?>query from server<\/span>/)
  })

  it('hydrates the query cache without fetching again', async () => {
    const page = await createPage('/')
    await page.waitForSelector('[data-hydrated="true"]')
    expect(await page.locator('[data-query]').textContent()).toBe('query from server')
    expect(await page.locator('[data-fetches]').textContent()).toBe('0')
    await page.close()
  })
})
