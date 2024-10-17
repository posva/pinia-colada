import fs from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export const extraFiles = {
  '@/components/ProductItem.vue': fs.readFileSync(
    join(__dirname, '../../../playground/src/components/ProductItem.vue'),
    'utf-8',
  ),

  '@/api/contacts.ts': fs.readFileSync(
    join(__dirname, '../../../playground/src/api/contacts.ts'),
    'utf-8',
  ),

  '@/api/products.ts': fs.readFileSync(
    join(__dirname, '../../../playground/src/api/products.ts'),
    'utf-8',
  ),

  'shims-vue.d.ts': `
declare module '*.vue' {
  import { defineComponent } from 'vue'
  export default defineComponent({})
}
`.trimStart(),
}
