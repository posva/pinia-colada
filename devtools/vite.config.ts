import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPluginFromDevframe } from '@vitejs/devtools-kit/node'
import Vue from '@vitejs/plugin-vue'
import TailwindCSS from '@tailwindcss/vite'
import { defineDevframe } from 'devframe'
import { defineConfig, normalizePath } from 'vite'
import VueRouter from 'vue-router/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import { piniaColadaDevframeDefaults } from './src/devframe.ts'
import type { ClientScriptEntry } from '@devframes/hub'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UiComponentRe = /^U[A-Z][a-z]/
const panelUrl = '/pinia-colada-devtools.html'
const clientScriptPath = normalizePath(resolve(__dirname, './src/client-script.ts'))

function PiniaColadaDevtoolsFixture() {
  return createPluginFromDevframe(
    defineDevframe({
      ...piniaColadaDevframeDefaults,
      importMetaUrl: import.meta.url,
      icon: '/src/panel/logo.svg',
    }),
    {
      dock: {
        clientScript: {
          importFrom: `/@fs/${clientScriptPath}`,
          // @ts-expect-error: TODO: add after the PR is merged
          eager: true,
        } satisfies ClientScriptEntry,
      },
      setup(ctx) {
        const dock = ctx.docks.views.get('pinia-colada')
        if (dock?.type === 'iframe') {
          ctx.docks.update({ ...dock, url: panelUrl })
        }
      },
    },
  )
}

export default defineConfig({
  devtools: {
    enabled: true,
  },
  root: __dirname,
  build: {
    outDir: 'dist-app',
  },
  resolve: {
    alias: [
      {
        find: /^@pinia\/colada$/,
        replacement: resolve(__dirname, '../src/index.ts'),
      },
      {
        find: /^@pinia\/colada-devtools\/shared$/,
        replacement: resolve(__dirname, './src/shared/index.ts'),
      },
    ],
  },
  plugins: [
    VueRouter({
      root: __dirname,
      routesFolder: [{ src: resolve(__dirname, './src/panel/pages') }],
      experimental: {
        paramParsers: {
          dir: resolve(__dirname, './src/params'),
        },
      },
    }),
    Vue(),
    PiniaColadaDevtoolsFixture(),
    Icons({ compiler: 'vue3' }),
    Components({
      dirs: [resolve(__dirname, './src/panel/components')],
      dts: false,
      resolvers: [
        (componentName) => {
          if (UiComponentRe.test(componentName)) {
            return {
              name: 'default',
              from: normalizePath(
                resolve(__dirname, `./src/panel/components/${componentName}.vue`),
              ),
            }
          }
        },
        IconsResolver({ alias: { park: 'icon-park' } }),
      ],
    }),
    TailwindCSS(),
  ],
})
