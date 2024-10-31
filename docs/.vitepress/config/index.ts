import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { extraFiles } from '../twoslash/files'
import { ModuleKind, ModuleResolutionKind, ScriptTarget } from 'typescript'

export const META_IMAGE = 'https://pinia-colada.esm.dev/social.png'
export const META_URL = 'https://pinia-colada.esm.dev'
export const META_TITLE = 'Pinia Colada 🍹'
export const META_DESCRIPTION = 'The smart Data Fetching layer for Pinia'

const rControl = /[\u0000-\u001F]/g
const rSpecial = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'“”‘’<>,.?/]+/g
const rCombining = /[\u0300-\u036F]/g

// get all code snippets
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const mutations_todos = fs.readFileSync(
  path.join(__dirname, '../code-snippets/mutations/todos.ts'),
  'utf-8',
)

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
            'mutations/todos.ts': mutations_todos,
            'api/todos.ts': fs.readFileSync(
              path.join(__dirname, '../code-snippets/api/todos.ts'),
              'utf-8',
            ),
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
        'src': 'https://cdn.usefathom.com/script.js',
        'data-site': 'WUXSABAN',
        'data-spa': 'auto',
        'defer': '',
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
          text: 'Advanced',
          items: [
            { text: 'Query Cache', link: '/advanced/query-cache.html' },
            { text: 'Plugins', link: '/advanced/plugins.html' },
          ],
        },
        {
          text: 'Cookbook',
          link: '/cookbook/',
          items: [],
        },
      ],
    },
  },
})
