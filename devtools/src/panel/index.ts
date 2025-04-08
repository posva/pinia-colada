import { defineCustomElement } from 'vue'
import DevtoolsPanelCE from './DevtoolsPanel.ce.vue'
import { configureApp } from './configure-app'

export const DevtoolsPanel = defineCustomElement(DevtoolsPanelCE, {
  configureApp,
  shadowRoot: true,
})
