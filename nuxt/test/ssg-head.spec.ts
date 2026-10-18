import { execFile } from 'node:child_process'
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const fixture = fileURLToPath(new URL('./fixtures/ssr-head', import.meta.url))

describe('@pinia/colada-nuxt static SEO generation', () => {
  it('generates query-backed metadata without serializing query functions twice', async () => {
    const testFixture = await mkdtemp(join(dirname(fixture), 'ssr-head-ssg-'))

    try {
      await cp(join(fixture, 'app'), join(testFixture, 'app'), { recursive: true })
      await cp(join(fixture, 'nuxt.config.ts'), join(testFixture, 'nuxt.config.ts'))
      await cp(join(fixture, 'package.json'), join(testFixture, 'package.json'))
      await execFileAsync('pnpm', ['exec', 'nuxi', 'generate', '--logLevel', 'silent'], {
        cwd: testFixture,
        timeout: 120_000,
      })

      for (const [id, author, content] of [
        ['one', 'Author One', 'Post one body'],
        ['two', 'Author Two', 'Post two body'],
      ] as const) {
        const html = await readFile(
          join(testFixture, '.output', 'public', 'posts', id, 'index.html'),
          'utf8',
        )

        expect(html).toContain(`<title>${author} | Colada SSR head</title>`)
        expect(html).toContain(`<meta name="description" content="${content}">`)
        expect(html).toContain(`<meta property="og:title" content="${author}">`)
        expect(html).toContain(`<meta property="og:description" content="${content}">`)
        expect(html).toContain('data-ssr="true"')
        expect(html).toContain(`<h1>${author}</h1>`)
        expect(html).toContain(`<p>${content}</p>`)
        expect(html).toContain('pinia_colada')
        expect(html).not.toContain('_pc_query')
        expect(html).toContain(author)
        expect(html).toContain(content)
        expect(html).toContain('unrelated-store-preserved')
      }
      // Oxfmt requires the standard `} finally {` layout.
      // eslint-disable-next-line @stylistic/brace-style
    } finally {
      await rm(testFixture, { recursive: true, force: true })
    }
  }, 150_000)
})
