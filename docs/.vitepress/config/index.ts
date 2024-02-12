import { defineConfig } from 'vitepress'

export const META_IMAGE = 'https://pinia-colada.esm.dev/social.png'
export const META_URL = 'https://pinia-colada.esm.dev'
export const META_TITLE = 'Pinia Colada 🍹'
export const META_DESCRIPTION = 'The smart Data Fetching layer for Pinia'

const rControl = /[\u0000-\u001f]/g
const rSpecial = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'“”‘’<>,.?/]+/g
const rCombining = /[\u0300-\u036F]/g

/**
 * Default slugification function
 */
export const slugify = (str: string): string =>
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
      },
    },

    // carbonAds: {
    //   code: 'CEBICK3I',
    //   placement: 'routervuejsorg',
    // },

    nav: [
      {
        text: 'Guide',
        link: '/guide/',
      },
      // { text: 'API', link: '/api/', activeMatch: '^/api/' },
      // { text: 'Cookbook', link: '/cookbook/', activeMatch: '^/cookbook/' },
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
      // catch-all fallback
      '/': [
        {
          text: 'Introduction',
          items: [
            {
              text: 'What is Pinia?',
              link: '/introduction.html',
            },
            {
              text: 'Getting Started',
              link: '/getting-started.html',
            },
          ],
        },
        {
          text: 'Guide',

          items: [],
        },
      ],
    },
  },
})
