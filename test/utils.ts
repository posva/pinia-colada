import type { mount } from '@vue/test-utils'
import type { Mock } from 'vitest'

export const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export type GlobalMountOptions = NonNullable<Parameters<typeof mount>[1]>['global']

export function isSpy<Fn extends (...args: unknown[]) => unknown>(fn: any): fn is Mock<Fn>
export function isSpy(fn: any): fn is Mock {
  return (
    typeof fn === 'function'
    && 'mock' in fn
    && typeof fn.mock === 'object'
    && Array.isArray(fn.mock.calls)
  )
}

export function promiseWithResolvers<T = unknown>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: any) => void
  // the executor is guaranteed to get executed right away
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
  return { promise, resolve, reject }
}
