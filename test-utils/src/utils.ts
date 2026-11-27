import type { mount } from '@vue/test-utils'
import type { Mock } from 'vitest'

export const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export type GlobalMountOptions = NonNullable<Parameters<typeof mount>[1]>['global']

export function isSpy<Fn extends (...args: unknown[]) => unknown>(fn: any): fn is Mock<Fn>
export function isSpy(fn: any): fn is Mock {
  return (
    typeof fn === 'function' &&
    'mock' in fn &&
    typeof fn.mock === 'object' &&
    Array.isArray(fn.mock.calls)
  )
}

/**
 * Forces garbage collection. Requires `--expose-gc` node flag.
 * Calls gc() twice with a microtask gap to handle weak ref chains.
 */
export async function triggerGC(): Promise<void> {
  if (typeof globalThis.gc !== 'function') {
    throw new Error('gc() not available. Run vitest with --expose-gc')
  }
  globalThis.gc()
  await new Promise((r) => setTimeout(r, 10))
  globalThis.gc()
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

/**
 * Async iterable controlled by the test.
 */
export function createStream<T>() {
  const steps = [promiseWithResolvers<IteratorResult<T, undefined>>()]
  let returned = false

  async function* iterate() {
    try {
      for (let i = 0; ; i++) {
        // oxlint-disable-next-line no-await-in-loop -- chunks arrive one by one
        const result = await steps[i]!.promise
        if (result.done) return
        yield result.value
      }
    } finally {
      returned = true
    }
  }

  return {
    iterable: iterate(),
    push(value: T) {
      steps.at(-1)!.resolve({ value, done: false })
      steps.push(promiseWithResolvers())
    },
    end() {
      steps.at(-1)!.resolve({ value: undefined, done: true })
    },
    fail(error: unknown) {
      steps.at(-1)!.reject(error)
    },
    get returned() {
      return returned
    },
  }
}
