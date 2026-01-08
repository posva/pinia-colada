import type { mount } from '@vue/test-utils'
import type { Mock } from 'vitest'
export declare const delay: (ms: number) => Promise<void>
export type GlobalMountOptions = NonNullable<Parameters<typeof mount>[1]>['global']
export declare function isSpy<Fn extends (...args: unknown[]) => unknown>(fn: any): fn is Mock<Fn>
export declare function promiseWithResolvers<T = unknown>(): {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: any) => void
}
