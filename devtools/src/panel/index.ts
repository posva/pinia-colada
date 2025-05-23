import { defineCustomElement } from 'vue'
import DevtoolsPanelCE from './DevtoolsPanel.ce.vue'
import { configureApp } from './configure-app'

export { configureApp, defineCustomElement, DevtoolsPanelCE }

export const DevtoolsPanel = defineCustomElement(DevtoolsPanelCE, {
  configureApp,
  shadowRoot: true,
})
