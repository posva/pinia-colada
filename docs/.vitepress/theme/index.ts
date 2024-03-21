import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import TwoSlashFloatingVue from '@shikijs/vitepress-twoslash/client'
import AsideSponsors from './components/AsideSponsors.vue'
import HomeSponsors from './components/HomeSponsors.vue'
import './styles/vars.css'
import './styles/playground-links.css'
import './styles/home-links.css'
import '@shikijs/vitepress-twoslash/style.css'

const theme: Theme = {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-features-after': () => h(HomeSponsors),
      'aside-ads-before': () => h(AsideSponsors),
    })
  },
  enhanceApp({ app }) {
    app.use(TwoSlashFloatingVue)
  },
}

export default theme
