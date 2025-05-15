import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export const extraFiles = {
  '@/components/ProductItem.vue': fs.readFileSync(
    path.join(__dirname, '../../../playground/src/components/ProductItem.vue'),
    'utf-8',
  ),

  '@/api/contacts.ts': fs.readFileSync(
    path.join(__dirname, '../../../playground/src/api/contacts.ts'),
    'utf-8',
  ),

  '@/api/products.ts': fs.readFileSync(
    path.join(__dirname, '../../../playground/src/api/products.ts'),
    'utf-8',
  ),

  'shims-vue.d.ts': `
declare module '*.vue' {
  import { defineComponent } from 'vue'
  export default defineComponent({})
}
`.trimStart(),
}

/**
 * Recursively read files in ./code-snippets and return an object like:
 * {
 *   './api/documents.ts': '<file content>',
 *   './utils/helper.ts': '<file content>',
 *   ...
 * }
 */
export function readSnippets(
  dir: string = path.join(__dirname, '../code-snippets'),
  baseDir: string = dir,
): Record<string, string> {
  const files: Record<string, string> = {}

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const relativePath = `./${path.relative(baseDir, fullPath).replace(/\\/g, '/')}`

    if (entry.isDirectory()) {
      Object.assign(files, readSnippets(fullPath, baseDir))
    } else {
      files[relativePath] = fs.readFileSync(fullPath, 'utf-8')
    }
  }

  return files
}
