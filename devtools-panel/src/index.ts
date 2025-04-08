import { defineCustomElement } from 'vue'
import DevtoolsPanelCE from './DevtoolsPanel.ce.vue'
import { configureApp } from './configure-app'
import './styles.css'

export const DevtoolsPanel = defineCustomElement(DevtoolsPanelCE, {
  configureApp,
  shadowRoot: true,
})

export {
  createQueryEntryPayload,
  type UseQueryEntryPayload,
  type UseQueryEntryPayloadDep,
  type UseQueryEntryPayloadDepComponent,
  type UseQueryEntryPayloadDepEffect,
} from './query-serialized'
