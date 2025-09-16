import { describe, expectTypeOf, it } from 'vitest'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import type {
  _Simplify,
  _IsMaybeRefOrGetter,
  _UnwrapMaybeRefOrGetter,
  _RemoveMaybeRef,
} from './utils'
import type { UseQueryOptions } from './query-options'

describe('utils', () => {
  it('_IsMaybeRefOrGetter', () => {
    expectTypeOf<_IsMaybeRefOrGetter<() => string>>().toEqualTypeOf<false>()

    expectTypeOf<
      _IsMaybeRefOrGetter<() => string | Ref<string> | ComputedRef<string>>
    >().toEqualTypeOf<false>()

    expectTypeOf<_IsMaybeRefOrGetter<MaybeRefOrGetter<string>>>().toEqualTypeOf<true>()
  })

  it('_UnwrapMaybeRefOrGetter', () => {
    expectTypeOf<_UnwrapMaybeRefOrGetter<() => string>>().toEqualTypeOf<string>()
    expectTypeOf<_UnwrapMaybeRefOrGetter<undefined | (() => string)>>().toEqualTypeOf<
      undefined | string
    >()
  })

  it('_RemoveMaybeRef', () => {
    expectTypeOf<
      _RemoveMaybeRef<{
        enabled?: MaybeRefOrGetter<boolean>
        b2?: MaybeRefOrGetter<boolean> | undefined
        b3: MaybeRefOrGetter<boolean> | undefined
      }>
    >().toEqualTypeOf<{
      enabled?: boolean | undefined
      b2?: boolean | undefined
      b3: boolean | undefined
    }>()

    expectTypeOf<
      _RemoveMaybeRef<
        {
          enabled?: MaybeRefOrGetter<boolean>
          b2?: MaybeRefOrGetter<boolean> | undefined
          b3: MaybeRefOrGetter<boolean> | undefined
        },
        "enabled"
      >
    >().toEqualTypeOf<{
      enabled?: MaybeRefOrGetter<boolean>
      b2?: boolean | undefined
      b3: boolean | undefined
    }>()

    expectTypeOf<
      _RemoveMaybeRef<{
        initialData?: () => string | undefined
      }>
    >().toEqualTypeOf<{
      initialData?: () => string | undefined
    }>()

    expectTypeOf<
      _RemoveMaybeRef<Pick<UseQueryOptions<string, unknown, string | undefined>, 'initialData'>>
    >().toEqualTypeOf<{
      initialData?: () => string | undefined
    }>()

    expectTypeOf<
      _RemoveMaybeRef<Pick<UseQueryOptions<string, Error, string>, 'initialData'>>
    >().toEqualTypeOf<{
      initialData?: () => string
    }>()
  })
})
