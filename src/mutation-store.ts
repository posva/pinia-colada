import { defineStore } from 'pinia'
import type { ShallowRef } from 'vue'
import { getCurrentScope, shallowReactive, shallowRef } from 'vue'
import type { MutationStatus, UseMutationOptions } from './use-mutation'
import type { ErrorDefault } from './types-extension'
import type { EntryKey } from './entry-options'
import { stringifyFlatObject } from './utils'

type MutationKey = string

interface UseMutationEntry<
    TResult = unknown,
    TVars = void,
    TError = ErrorDefault,
    TContext extends Record<any, any> | void | null = void,
> {
  options: UseMutationOptions<TResult, TVars, TError, TContext>
  /**
   * The status of the query.
   */
  status: ShallowRef<MutationStatus>
  /**
   * The data returned by the mutation.
   */
  data: ShallowRef<TResult | undefined>
  /**
   * The error rejected by the mutation.
   */
  error: ShallowRef<TError | null>
  /**
   * The key associated with this mutation entry.
   */
  key: ShallowRef<MutationKey | undefined>
}

function createMutationEntry<
    TResult,
    TVars,
    TError,
    TContext extends Record<any, any> | void | null = void,
>(options: UseMutationOptions<TResult, TVars, TError, TContext>) {
  const status = shallowRef<MutationStatus>('pending')
  const data = shallowRef<TResult>()
  const error = shallowRef<TError | null>(null)
  // set the key if it is static
  const keyRaw = typeof options.key !== 'function' ? options.key : undefined
  const key = shallowRef(keyRaw?.map(stringifyFlatObject).join())

  return {
    status,
    data,
    error,
    key,
    options,
  }
}

/**
 * The id of the store used for mutations.
 * @internal
 */
export const MUTATION_STORE_ID = '_pc_mutation'

// TODO: add test cases
export const useMutationStore = defineStore(MUTATION_STORE_ID, () => {
  // TODO: find a better way to type the Set?
  const entriesRaw = new Set<UseMutationEntry<any, any, any, any>>()
  const entries = shallowReactive(entriesRaw)

  // this allows use to attach reactive effects to the scope later on
  const scope = getCurrentScope()!

  function createEntry<
      TResult = unknown,
      TVars = void,
      TError = ErrorDefault,
      TContext extends Record<any, any> | void | null = void,
  >(options: UseMutationOptions<TResult, TVars, TError, TContext>) {
    const entry = scope.run(() => createMutationEntry<TResult, TVars, TError, TContext>(options))!

    entriesRaw.add(entry)

    return entry
  }

  /**
   * Update key if it is a getter
   */
  function updateKey<
      TResult,
      TVars,
      TError,
      TContext extends Record<any, any> | void | null = void,
  >(entry: UseMutationEntry<TResult, TVars, TError, TContext>, vars: TVars) {
    // change only if the key is dynamic
    if (typeof entry.options.key === 'function') {
      entry.key.value = entry.options.key(vars).map(stringifyFlatObject).join()
    }
  }

  function resetKey<
      TResult,
      TVars,
      TError,
      TContext extends Record<any, any> | void | null = void,
  >(entry: UseMutationEntry<TResult, TVars, TError, TContext>) {
    // initial value of an entry with getter key is undefined
    if (typeof entry.options.key === 'function') {
      entry.key.value = undefined
    }
  }

  function removeEntry<
      TResult,
      TVars,
      TError,
      TContext extends Record<any, any> | void | null = void,
  >(entry: UseMutationEntry<TResult, TVars, TError, TContext>) {
    entriesRaw.delete(entry)
  }

  function getEntriesWithKey(keyRaw: EntryKey): UseMutationEntry[] {
    // return array, in case we have 1 < mutations with the same key
    const result = []
    const key = keyRaw.map(stringifyFlatObject).join()
    for (const entry of entries) {
      if (entry.key.value === key) result.push(entry)
    }

    return result
  }

  return {
    entries,
    createEntry,
    updateKey,
    resetKey,
    removeEntry,
    getEntriesWithKey,
  }
})
