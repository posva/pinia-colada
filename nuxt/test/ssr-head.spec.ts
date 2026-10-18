import { $fetch, createPage, setup } from '@nuxt/test-utils/e2e'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('@pinia/colada-nuxt SSR SEO metadata', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/ssr-head', import.meta.url)),
    browser: true,
  })

  it('renders query-backed SEO tags in the initial SSR HTML', async () => {
    const html = await $fetch('/posts/one')

    expect(html).toContain('<title>Author One | Colada SSR head</title>')
    expect(html).toContain('<meta name="description" content="Post one body">')
    expect(html).toContain('<meta property="og:title" content="Author One">')
    expect(html).toContain('<meta property="og:description" content="Post one body">')
    expect(html).toContain('<h1>Author One</h1>')
    expect(html).toContain('data-pinia-marker="unrelated-store-preserved"')
  })

  it('keeps query-backed metadata isolated across concurrent SSR requests', async () => {
    const [one, two] = await Promise.all([$fetch('/posts/one'), $fetch('/posts/two')])

    expect(one).toContain('<title>Author One | Colada SSR head</title>')
    expect(one).toContain('<h1>Author One</h1>')
    expect(one).not.toContain('Author Two')
    expect(two).toContain('<title>Author Two | Colada SSR head</title>')
    expect(two).toContain('<h1>Author Two</h1>')
    expect(two).not.toContain('Author One')
  })

  it('hydrates the query without a duplicate fetch and updates head on navigation', async () => {
    const page = await createPage('/posts/one')
    const pageErrors: Error[] = []
    page.on('pageerror', (error) => {
      pageErrors.push(error)
    })

    try {
      await page.locator('main[data-hydrated="true"]').waitFor()
      expect(await page.title()).toBe('Author One | Colada SSR head')
      expect(await page.locator('main').getAttribute('data-fetches')).toBe('0')
      expect(await page.locator('main').getAttribute('data-pinia-marker')).toBe(
        'unrelated-store-preserved',
      )

      await page.getByRole('link', { name: 'Next post' }).click()
      await page.locator('main[data-post-id="two"][data-hydrated="true"]').waitFor()
      expect(await page.title()).toBe('Author Two | Colada SSR head')
      expect(await page.locator('main').getAttribute('data-fetches')).toBe('1')
      expect(pageErrors).toEqual([])
      // Oxfmt requires the standard `} finally {` layout.
      // eslint-disable-next-line @stylistic/brace-style
    } finally {
      await page.close()
    }
  })
})
