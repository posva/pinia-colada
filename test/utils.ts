import type { mount } from '@vue/test-utils'
import type { Mock } from 'vitest'

export const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export type GlobalMountOptions = NonNullable<
  Parameters<typeof mount>[1]
>['global']

export function isSpy(fn: any): fn is Mock {
  return (
    typeof fn === 'function'
    && 'mock' in fn
    && typeof fn.mock === 'object'
    && Array.isArray(fn.mock.calls)
  )
}
