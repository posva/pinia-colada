import { defineConfig } from 'vitepress'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import llmstxt from 'vitepress-plugin-llms'
import { extraFiles, readSnippets } from '../twoslash/files'
import { ModuleKind, ModuleResolutionKind, ScriptTarget } from 'typescript'
import typedocSidebar from '../../api/typedoc-sidebar.json'

export const META_IMAGE = 'https://pinia-colada.esm.dev/social.png'
export const META_URL = 'https://pinia-colada.esm.dev'
export const META_TITLE = 'Pinia Colada 🍹'
export const META_DESCRIPTION = 'The smart Data Fetching layer for Pinia'

const rControl = /[\u0000-\u001F]/g
const rSpecial = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'“”‘’<>,.?/]+/g
const rCombining = /[\u0300-\u036F]/g

const twoslashSnippets = readSnippets()

/**
 * Default slugification function
 */
export function slugify(str: string): string {
  return (
    str
      .normalize('NFKD')
      // Remove accents
      .replace(rCombining, '')
      // Remove control characters
      .replace(rControl, '')
      // Replace special characters
      .replace(rSpecial, '-')
      // ensure it doesn't start with a number
      .replace(/^(\d)/, '_$1')
  )
}

export default defineConfig({
  title: 'Pinia Colada',
  appearance: 'dark',

  vite: {
    plugins: [
      llmstxt({
        description: 'Smart data fetching for Vue.js',
        details: `
- Automatic caching
- Request deduplication
- Opmitistic updates
- Async state management
- Sensible defaults
- Extensible

Pinia Colada is a smart data fetching layer for Vue.js. It consist of two main concepts:

- Queries: they are designed to read data from a server. They are automatically cached and deduplicated. They are mainly defined with the "useQuery" function.
- Mutations: they are designed to write data to a server. They can be used to update the cache and create optimistic updates. They are mainly defined with the "useMutation" function.

On top of that Pinia Colada is highly extensible. You can create your own plugins to extend the functionality of Pinia Colada. You can also use Pinia Colada with Nuxt.js and Vue Router.
`.trim(),
        ignoreFiles: [
          //
          // path.join(__dirname, '../'),
          // path.join(__dirname, '../../public/'),
          // path.join(__dirname, '../../api/**/*'),
          // path.join(__dirname, '../../index.md'),
          'index.md',
          // 'api/*',
          'api/**/*',
        ],
      }),
    ],
  },

  markdown: {
    theme: {
      dark: 'dracula-soft',
      light: 'vitesse-light',
    },

    attrs: {
      leftDelimiter: '%{',
      rightDelimiter: '}%',
    },

    anchor: {
      slugify,
    },
    codeTransformers: [
      transformerTwoslash({
        // renderer: rendererRich(),
        twoslashOptions: {
          compilerOptions: {
            module: ModuleKind.ESNext,
            moduleResolution: ModuleResolutionKind.Bundler,
            target: ScriptTarget.ESNext,
            // TODO: it would be nice to have this
            // lib: ['esnext', 'dom'],
          },
          extraFiles: {
            ...extraFiles,
            ...twoslashSnippets,
            '@/api/documents.ts': twoslashSnippets['./api/documents.ts'],
            '@/queries/documents.ts': twoslashSnippets['./queries/documents.ts'],
          },
        },
      }),
    ],
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['link', { rel: 'icon', type: 'image/png', href: '/logo.png' }],

    ['meta', { property: 'og:url', content: META_URL }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:description', content: META_DESCRIPTION }],

    ['meta', { property: 'twitter:url', content: META_URL }],
    ['meta', { property: 'twitter:title', content: META_TITLE }],
    ['meta', { property: 'twitter:description', content: META_DESCRIPTION }],
    ['meta', { property: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { property: 'twitter:image', content: META_IMAGE }],

    [
      'script',
      {
        src: 'https://cdn.usefathom.com/script.js',
        'data-site': 'WUXSABAN',
        'data-spa': 'auto',
        defer: '',
      },
    ],
  ],

  themeConfig: {
    logo: '/logo.svg',
    outline: [2, 3],

    socialLinks: [
      { icon: 'x', link: 'https://twitter.com/posva' },
      {
        icon: 'github',
        link: 'https://github.com/posva/pinia-colada',
      },
      {
        icon: 'discord',
        link: 'https://chat.vuejs.org',
      },
    ],

    footer: {
      copyright: 'Copyright © 2023-present Eduardo San Martin Morote',
      message: 'Released under the MIT License.',
    },

    editLink: {
      pattern: 'https://github.com/posva/pinia-colada/edit/main/docs/:path',
      text: 'Suggest changes to this page',
    },

    search: {
      provider: 'local',
      options: {
        detailedView: true,
        miniSearch: {
          searchOptions: {
            boostDocument(docId: string) {
              if (docId.startsWith('/api/')) return 0.1
              if (docId.startsWith('/guide/')) return 1.5
              return 1
            },
          },
        },
      },
    },

    carbonAds: {
      code: 'CEBICK3I',
      placement: 'routervuejsorg',
    },

    nav: [
      {
        text: 'Guide',
        link: '/guide/installation.html',
      },
      { text: 'API', link: '/api/', activeMatch: '^/api/' },
      { text: 'Cookbook', link: '/cookbook/', activeMatch: '^/cookbook/' },
      {
        text: 'Links',
        items: [
          {
            text: 'Discussions',
            link: 'https://github.com/posva/pinia-colada/discussions',
          },
          {
            text: 'Changelog',
            link: 'https://github.com/posva/pinia-colada/blob/main/CHANGELOG.md',
          },
        ],
      },
    ],

    sidebar: {
      '/api/': [
        {
          text: 'API',
          items: typedocSidebar,
        },
      ],
      '/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Quick Start', link: '/quick-start.html' },
            { text: 'Why', link: '/why.html' },
          ],
        },
        {
          text: 'Guide',
          items: [
            { text: 'Installation', link: '/guide/installation.html' },
            { text: 'Queries', link: '/guide/queries.html' },
            { text: 'Query Keys', link: '/guide/query-keys.html' },
            { text: 'Query Meta', link: '/guide/query-meta.html' },
            { text: 'Paginated Queries', link: '/guide/paginated-queries.html' },
            { text: 'Mutations', link: '/guide/mutations.html' },
            {
              text: 'Query Invalidation',
              link: '/guide/query-invalidation.html',
            },
            {
              text: 'Optimistic Updates',
              link: '/guide/optimistic-updates.html',
            },
            {
              text: 'Nuxt',
              link: '/nuxt.html',
            },
            {
              text: 'SSR',
              link: '/guide/ssr.html',
            },
          ],
        },
        {
          text: 'Plugins',
          items: [
            { text: 'Writing plugins', link: '/plugins/writing-plugins.html' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Query Cache', link: '/advanced/query-cache.html' },
            { text: 'Reusable Queries', link: '/advanced/reusable-queries.html' },
          ],
        },
        {
          text: 'Cookbook',
          link: '/cookbook/',
          items: [
            { text: 'Prefetching', link: '/cookbook/prefetching.html' },
            { text: 'Cache Persistence', link: '/cookbook/cache-persistence.html' },
            { text: 'Migrating from Tanstack Query', link: '/cookbook/migration-tvq.html' },
          ],
        },
      ],
    },
  },
})
