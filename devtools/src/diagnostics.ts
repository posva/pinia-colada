import { createConsoleReporter, defineDiagnostics } from 'nostics'

export const diagnostics = /*#__PURE__*/ defineDiagnostics({
  docsBase: (code) => `https://pinia-colada.esm.dev/diagnostics/${code.toLowerCase()}`,
  reporters: [/*#__PURE__*/ createConsoleReporter()],
  codes: {
    PCD_R0001: {
      why: '[@pinia/colada] Cannot replay: mutation entry not found',
      fix: 'Select a mutation that is still present in the devtools mutation list before replaying it.',
    },
    PCD_R0002: {
      why: "[@pinia/colada] Cannot replay: mutation is in the process of being garbage collected. It isn't used anywhere and replaying it will have no effect.",
      fix: 'Replay an active mutation entry, or trigger the mutation again from the application.',
    },
    PCD_R0003: {
      why: (p: { target: 'devtools element' | 'devtools root element' }) =>
        `No ${p.target} found for Pinia Colada devtools`,
      fix: 'Make sure the Pinia Colada devtools custom element is mounted before opening the panel window.',
    },
    PCD_R0004: {
      why: 'Failed to open PiP window for Pinia Colada devtools',
      fix: 'Allow popups for the current page, then try opening the Pinia Colada devtools window again.',
    },
    PCD_R0005: {
      why: 'Failed to find devtools element for Pinia Colada devtools',
      fix: 'Reload the page and make sure the Pinia Colada devtools wrapper is mounted.',
    },
    PCD_R0006: {
      why: (p: { resource: 'duplex channel' | 'query entries' | 'mutation entries' }) =>
        `The ${p.resource} is not provided. Make sure to use it inside the context of a component that provides it.`,
      fix: 'Render this composable under the devtools provider component that provides the required injection key.',
    },
    PCD_R0007: {
      why: (p: { channel: string; data: string }) => `${p.channel}: invalid message ${p.data}`,
      fix: 'Send RPC messages as objects with a string id and serialized data payload.',
    },
    PCD_R0008: {
      why: (p: { channel: string }) => `${p.channel}: message error`,
      fix: 'Check that all RPC payload values can be cloned through MessagePort.',
    },
    PCD_R0009: {
      why: 'Cannot set value with empty path',
      fix: 'Select a nested value in the JSON editor before applying an update.',
    },
    PCD_R0010: {
      why: (p: { path: string; index: number; value: string }) =>
        `Invalid path: ${p.path} at index ${p.index}. Current value: ${p.value}`,
      fix: 'Edit an existing object or array path, or refresh the query entry before editing.',
    },
    PCD_R0011: {
      why: (p: { path: string }) => `Invalid final parent in path: ${p.path}`,
      fix: 'Edit a path whose parent is still an object or array.',
    },
    PCD_R0012: {
      why: (p: { path: string }) => `Failed to update value at path: ${p.path}`,
      fix: 'Refresh the selected query entry and retry the edit.',
    },
    PCD_R0013: {
      why: 'Invalid JSON',
      fix: 'Enter valid JSON, or use the explicit undefined value when editing an undefined value.',
    },
    PCD_R0014: {
      why: 'Invalid BigInt',
      fix: 'Enter a valid BigInt string without decimal points or separators.',
    },
    PCD_R0015: {
      why: 'Invalid number',
      fix: 'Enter a value that JavaScript can parse as a finite number.',
    },
    PCD_R0016: {
      why: "root node of element isn't a ShadowRoot or Document",
      fix: 'Pass an element attached to a document or shadow root.',
    },
  },
})

export function formatDiagnosticValue(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}
