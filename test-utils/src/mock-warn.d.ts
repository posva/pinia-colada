interface CustomMatchers<R = unknown> {
  toHaveBeenWarned: () => R
  toHaveBeenWarnedLast: () => R
  toHaveBeenWarnedTimes: (n: number) => R
  toHaveBeenErrored: () => R
  toHaveBeenErroredLast: () => R
  toHaveBeenErroredTimes: (n: number) => R
}
declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
export declare function mockWarn(): void
export declare function mockConsoleError(): void
