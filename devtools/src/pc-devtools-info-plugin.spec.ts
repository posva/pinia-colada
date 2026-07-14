import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada, useMutation, useMutationCache, useQuery, useQueryCache } from '@pinia/colada'
import { DEVTOOLS_INFO_KEY } from '@pinia/colada-devtools/shared'
import {
  addDevtoolsInfo,
  createMutationEntryPayload,
  createQueryEntryPayload,
} from './pc-devtools-info-plugin'

describe('devtools info plugin', () => {
  enableAutoUnmount(afterEach)

  function factory() {
    const pinia = createPinia()
    // create the caches within an app context to avoid inject() warnings
    createApp({}).use(pinia).use(PiniaColada, {})
    const queryCache = useQueryCache(pinia)
    const mutationCache = useMutationCache(pinia)

    return {
      queryCache,
      mutationCache,
      // mimics mounting `<PiniaColadaDevtools />`
      installDevtools: () => addDevtoolsInfo(queryCache, mutationCache),
      // mounts a component that uses pinia colada composables
      mountComponent: (setup: () => unknown) =>
        mount(
          defineComponent({
            template: '<div></div>',
            setup: () => {
              setup()
              return {}
            },
          }),
          { global: { plugins: [pinia, [PiniaColada, {}]] } },
        ),
    }
  }

  it('initializes the info of query entries created with setQueryData', async () => {
    const { queryCache, installDevtools, mountComponent } = factory()
    installDevtools()

    // write-through cache: the entry is created by setQueryData, not by a fetch
    queryCache.setQueryData(['todos'], ['a'])
    const entry = queryCache.getEntries({ key: ['todos'], exact: true })[0]!
    expect(entry[DEVTOOLS_INFO_KEY]).toBeDefined()

    // a disabled query observes the entry, then unmounts and untracks it
    const wrapper = mountComponent(() =>
      useQuery({ key: ['todos'], query: async () => [], enabled: false }),
    )
    await flushPromises()
    expect(() => wrapper.unmount()).not.toThrow()
    expect(entry[DEVTOOLS_INFO_KEY].inactiveAt).toBeGreaterThan(0)
  })

  it('initializes the info of query entries that existed before the devtools', () => {
    const { queryCache, installDevtools } = factory()
    queryCache.setQueryData(['todos'], ['a'])
    installDevtools()

    const entry = queryCache.getEntries({ key: ['todos'], exact: true })[0]!
    expect(entry[DEVTOOLS_INFO_KEY]).toBeDefined()
    // entries with data get their history seeded
    expect(entry[DEVTOOLS_INFO_KEY].history).toHaveLength(1)
  })

  it('initializes the info of mutation entries created before the devtools', () => {
    const { installDevtools, mountComponent } = factory()

    // unensured mutation entries are not in the cache yet, so they are
    // invisible to the devtools installation
    const wrapper = mountComponent(() => useMutation({ mutation: async () => 'ok' }))
    installDevtools()

    // triggers untrack on the entry
    expect(() => wrapper.unmount()).not.toThrow()
  })

  it('serializes mutation entries created before the devtools', async () => {
    const { mutationCache, installDevtools, mountComponent } = factory()

    let mutate!: (vars: void) => void
    mountComponent(() => ({ mutate } = useMutation({ mutation: async () => 'ok' })))
    installDevtools()

    mutate()
    await flushPromises()

    const entry = mutationCache.getEntries()[0]!
    expect(() => createMutationEntryPayload(entry)).not.toThrow()
    expect(createMutationEntryPayload(entry).active).toBe(true)
  })

  it('serializes entries even if the devtools were never installed', () => {
    const { queryCache, mutationCache, mountComponent } = factory()

    queryCache.setQueryData(['todos'], ['a'])
    const queryEntry = queryCache.getEntries({ key: ['todos'], exact: true })[0]!
    expect(() => createQueryEntryPayload(queryEntry)).not.toThrow()
    expect(createQueryEntryPayload(queryEntry).devtools).toBeDefined()

    let mutate!: (vars: void) => void
    mountComponent(() => ({ mutate } = useMutation({ mutation: async () => 'ok' })))
    mutate()

    const mutationEntry = mutationCache.getEntries()[0]!
    expect(() => createMutationEntryPayload(mutationEntry)).not.toThrow()
    expect(createMutationEntryPayload(mutationEntry).active).toBe(true)
  })
})
