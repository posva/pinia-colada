import { defineCustomElement } from 'vue'
import DevtoolsPanelCE from './DevtoolsPanel.ce.vue'
import { configureApp } from './configure-app'
// import './styles.css'
// import '@pinia/colada-devtools/panel/index.css'

export const DevtoolsPanel = defineCustomElement(DevtoolsPanelCE, {
  configureApp,
  shadowRoot: true,
})
