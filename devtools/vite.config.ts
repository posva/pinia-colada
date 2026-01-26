import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin, PluginOption } from 'vite-plus'
import { defineConfig } from 'vite-plus'
import Vue from '@vitejs/plugin-vue'
import VueDevtools from 'vite-plugin-vue-devtools'
import Dts from 'vite-plugin-dts'
import VueRouter from 'vue-router/vite'
import TailwindCSS from '@tailwindcss/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UiComponentRe = /^U[A-Z][a-z]/

/**
 * Wrap a plugin to only apply to specific environments
 */
function forEnvironments(envNames: string[], plugin: PluginOption): PluginOption {
  if (!plugin) return plugin

  if (Array.isArray(plugin)) {
    return plugin.map((p) => forEnvironments(envNames, p))
  }

  if (plugin instanceof Promise) {
    return plugin.then((p) => forEnvironments(envNames, p))
  }

  const wrapped = { ...plugin } as Plugin
  wrapped.applyToEnvironment = (env) => envNames.includes(env.name)
  return wrapped
}

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@pinia\/colada$/,
        replacement: resolve(__dirname, '../src/index.ts'),
      },
      {
        find: /^@pinia\/colada-devtools$/,
        replacement: resolve(__dirname, './src/index.ts'),
      },
      {
        find: /^@pinia\/colada-devtools\/panel$/,
        replacement: resolve(__dirname, './src/panel/index.ts'),
      },
      {
        find: /^@pinia\/colada-devtools\/shared$/,
        replacement: resolve(__dirname, './src/shared/index.ts'),
      },
      {
        find: /^@pinia\/colada-devtools\/panel\/index\.css$/,
        replacement: resolve(__dirname, './src/panel/styles.css'),
      },
    ],
  },

  define: {
    // NOTE: needed to avoid HMR not working when using the devtools
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    // allows to be changed when consuming the devtools
    NODE_ENV: process.env.NODE_ENV === 'production' ? `process.env.NODE_ENV` : '"development"',
  },

  // Default (client) environment = main build
  build: {
    sourcemap: true,
    // to debug
    // minify: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PiniaColadaDevtools',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'vue',
        '@pinia/colada',
        'vue-router',
        'pinia',
        '@pinia/colada-devtools/shared',
        '@pinia/colada-devtools/panel',
        // TODO: check if needed
        '@pinia/colada-devtools/panel/index.css',
      ],
    },
  },

  // Additional environments
  environments: {
    // Disable default ssr environment
    ssr: { build: { outDir: '.ssr-unused' } },
    panel: {
      build: {
        sourcemap: true,
        outDir: resolve(__dirname, './dist-panel'),
        lib: {
          entry: resolve(__dirname, './src/panel/index.ts'),
          name: 'PiniaColadaDevtools_Panel',
          formats: ['es'],
          fileName: 'index',
        },
        rollupOptions: {
          external: ['@pinia/colada-devtools/shared'],
        },
      },
    },
    shared: {
      build: {
        sourcemap: true,
        outDir: resolve(__dirname, './dist-shared'),
        lib: {
          entry: resolve(__dirname, './src/shared/index.ts'),
          name: 'PiniaColadaDevtools_Shared',
          formats: ['es'],
          fileName: 'index',
        },
        rollupOptions: {
          external: ['vue', '@pinia/colada', 'pinia'],
        },
      },
    },
  },

  // Build only our target environments (skip default ssr)
  builder: {
    buildApp: async (builder) => {
      const targetEnvs = ['client', 'panel', 'shared']
      await Promise.all(targetEnvs.map((name) => builder.build(builder.environments[name]!)))
    },
  },

  plugins: [
    // VueRouter: only for client and panel (not shared)
    forEnvironments(
      ['client', 'panel'],
      VueRouter({
        root: resolve(__dirname, '.'),
        routesFolder: [
          {
            src: resolve(__dirname, './src/panel/pages'),
          },
        ],
        experimental: {
          paramParsers: {
            dir: 'src/params',
          },
        },
      }),
    ),

    // Vue: all environments
    Vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => {
            return tag.startsWith('pinia-colada-')
          },
        },
      },
    }),

    // Icons: only client and panel
    forEnvironments(['client', 'panel'], Icons({ compiler: 'vue3' })),

    // VueDevtools: only client (dev)
    forEnvironments(['client'], VueDevtools()),

    // Components: only client and panel
    forEnvironments(
      ['client', 'panel'],
      Components({
        dirs: [resolve(__dirname, './src/panel/components')],
        // to avoid erasing the generated dts file during dev
        dts: process.env.NODE_ENV !== 'production',
        // avoid declaring the .ce components twice
        globsExclude: ['**/*.ce.vue'],
        resolvers: [
          (componentName) => {
            if (UiComponentRe.test(componentName)) {
              return {
                name: `default`,
                from: resolve(__dirname, `./src/panel/components/${componentName}.ce.vue`),
              }
            }
          },
          IconsResolver({
            alias: {
              park: 'icon-park',
            },
          }),
        ],
      }),
    ),

    // Dts: only client (main entry point types)
    forEnvironments(['client'], Dts({ rollupTypes: true })),

    // TailwindCSS: client and panel
    forEnvironments(['client', 'panel'], TailwindCSS()),
  ],
})
