import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, customRef, defineComponent, nextTick } from 'vue'
import type { ShallowRef } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada, useMutation, useMutationCache, useQuery, useQueryCache } from '@pinia/colada'
import type { AsyncStatus } from '@pinia/colada'
import type { AppProcedures, DevtoolsProcedures } from '@pinia/colada-devtools/shared'
import {
  restoreClonedDeep,
  serializeDevtoolsValue,
  trackPromise,
} from '@pinia/colada-devtools/shared'
import { setupDevtoolsAppBridge } from './app-bridge'
import type { DevtoolsAppBridge } from './app-bridge'

describe('app bridge', () => {
  enableAutoUnmount(afterEach)

  function factory(installImmediately = true) {
    const pinia = createPinia()
    // create the caches within an app context to avoid inject() warnings
    createApp({}).use(pinia).use(PiniaColada, {})
    const queryCache = useQueryCache(pinia)
    const mutationCache = useMutationCache(pinia)

    const listeners = new Map<keyof AppProcedures, Set<(...args: any[]) => void>>()
    let bridge: DevtoolsAppBridge | undefined
    const installBridge = () =>
      (bridge ??= setupDevtoolsAppBridge(queryCache, mutationCache, (event, ...args) => {
        for (const listener of listeners.get(event) ?? []) listener(...args)
      }))
    if (installImmediately) installBridge()
    const devtools = {
      emit<K extends keyof DevtoolsProcedures>(
        event: K,
        ...args: Parameters<DevtoolsProcedures[K]>
      ) {
        const handler = installBridge().actions[event] as (
          ...args: Parameters<DevtoolsProcedures[K]>
        ) => void
        handler(...args)
      },
      on<K extends keyof AppProcedures>(
        event: K,
        callback: (...args: Parameters<AppProcedures[K]>) => void,
      ) {
        let eventListeners = listeners.get(event)
        if (!eventListeners) listeners.set(event, (eventListeners = new Set()))
        eventListeners.add(callback)
        return () => eventListeners.delete(callback)
      },
    }

    return {
      queryCache,
      mutationCache,
      devtools,
      installBridge,
      // mounts a component that uses pinia colada composables
      mountComponent: (setup: () => unknown, template = '<div></div>') =>
        mount(
          defineComponent({
            template,
            setup: () => {
              const result = setup()
              return result && typeof result === 'object' ? result : {}
            },
          }),
          { global: { plugins: [pinia, [PiniaColada, {}]] } },
        ),
    }
  }

  function nextEmission<K extends keyof AppProcedures>(
    devtools: ReturnType<typeof factory>['devtools'],
    event: K,
  ) {
    return new Promise<Parameters<AppProcedures[K]>>((resolve) => {
      const off = devtools.on(event, (...args) => {
        off()
        resolve(args)
      })
    })
  }

  // waits until no emission of the given event arrives for a quiet window, so
  // updates queued by previous cache operations don't leak into assertions
  function drainEmissions<K extends keyof AppProcedures>(
    devtools: ReturnType<typeof factory>['devtools'],
    event: K,
    quiet = 50,
  ) {
    return new Promise<void>((resolve) => {
      const done = () => {
        off()
        resolve()
      }
      let timer = setTimeout(done, quiet)
      const off = devtools.on(event, () => {
        clearTimeout(timer)
        timer = setTimeout(done, quiet)
      })
    })
  }

  // mimics @pinia/colada-plugin-delay: `asyncStatus` becomes a customRef that
  // defers the switch to 'loading'
  function delayAsyncStatus(target: { asyncStatus: ShallowRef<AsyncStatus> }, delay = 200) {
    const initialValue = target.asyncStatus.value
    target.asyncStatus = customRef<AsyncStatus>((track, trigger) => {
      let value = initialValue
      let timeout: ReturnType<typeof setTimeout> | undefined
      return {
        get: () => {
          track()
          return value
        },
        set: (newValue) => {
          clearTimeout(timeout)
          if (newValue === 'loading') {
            timeout = setTimeout(() => {
              value = newValue
              trigger()
            }, delay)
          } else {
            value = newValue
            trigger()
          }
        },
      }
    }) as ShallowRef<AsyncStatus>
  }

  it('reports loading right away on simulate even if a plugin delays asyncStatus', async () => {
    const { queryCache, devtools } = factory()
    queryCache.setQueryData(['todos'], ['a'])
    const entry = queryCache.getEntries({ key: ['todos'], exact: true })[0]!
    delayAsyncStatus(entry)
    // drain the update queued by setQueryData before subscribing
    await drainEmissions(devtools, 'queries:update')

    const update = nextEmission(devtools, 'queries:update')
    devtools.emit('queries:simulate:loading', ['todos'])
    const [payload] = await update
    expect(payload.asyncStatus).toBe('loading')
    expect(payload.devtools.simulate).toBe('loading')

    // stopping restores idle immediately
    const stopUpdate = nextEmission(devtools, 'queries:update')
    devtools.emit('queries:simulate:loading:stop', ['todos'])
    const [stopPayload] = await stopUpdate
    expect(stopPayload.asyncStatus).toBe('idle')
    expect(stopPayload.devtools.simulate).toBe(null)
  })

  it('keeps native values when editing query data', async () => {
    const { queryCache, devtools, mountComponent } = factory()
    const url = new URL('https://pinia-colada.esm.dev/guide/')
    const urlSearchParams = new URLSearchParams({ fixture: 'params' })
    const buffer = new Uint8Array([1, 2, 3]).buffer
    const typedArray = new Uint16Array([1, 2, 3])
    const dataView = new DataView(buffer)
    const blob = new Blob(['fixture'], { type: 'text/plain' })
    const file = new File(['fixture'], 'fixture.txt', { type: 'text/plain' })
    const promise = trackPromise(Promise.resolve('fulfilled'))
    const map = new Map<unknown, unknown>([
      ['count', 1],
      ['native', url],
    ])
    const setObject = { nested: 'before' }
    const set = new Set<unknown>(['one', setObject])
    const shared = { label: 'shared' }
    await promise
    const data = {
      count: 1,
      url,
      urlSearchParams,
      buffer,
      typedArray,
      dataView,
      blob,
      file,
      promise,
      map,
      set,
      first: shared,
      second: shared,
    }
    queryCache.setQueryData(['rich-values'], data)
    const entry = queryCache.getEntries({ key: ['rich-values'], exact: true })[0]!
    const wrapper = mountComponent(() => {
      const queryData = useQuery({
        key: ['rich-values'],
        query: async () => data,
        staleTime: Infinity,
      }).data
      return { queryData }
    }, '<div data-testid="count">{{ queryData?.count }}</div>')
    expect(wrapper.get('[data-testid="count"]').text()).toBe('1')
    const editedState = restoreClonedDeep(serializeDevtoolsValue(entry.state.value))
    ;(editedState.data as typeof data).count = 2
    ;(editedState.data as typeof data).map.set('count', 2)
    ;(editedState.data as typeof data).set = new Set(['updated', { nested: 'after' }])

    devtools.emit('queries:set:state', ['rich-values'], editedState)
    await nextTick()

    const updatedData = entry.state.value.data as typeof data
    expect(wrapper.get('[data-testid="count"]').text()).toBe('2')
    expect(updatedData).not.toBe(data)
    expect(updatedData.count).toBe(2)
    expect(updatedData.url).toBe(url)
    expect(updatedData.urlSearchParams).toBe(urlSearchParams)
    expect(updatedData.buffer).toBe(buffer)
    expect(new Uint8Array(updatedData.buffer)).toEqual(new Uint8Array([1, 2, 3]))
    expect(updatedData.typedArray).toBe(typedArray)
    expect(updatedData.dataView).toBe(dataView)
    expect(updatedData.blob).toBe(blob)
    expect(updatedData.file).toBe(file)
    expect(updatedData.promise).toBe(promise)
    expect(updatedData.map).toBe(map)
    expect(updatedData.map.get('count')).toBe(2)
    expect(updatedData.map.get('native')).toBe(url)
    expect(updatedData.set).toBe(set)
    expect(Array.from(updatedData.set)).toEqual(['updated', setObject])
    expect(setObject.nested).toBe('after')
    expect(updatedData.first).toBe(shared)
    expect(updatedData.second).toBe(shared)
  })

  it('reports idle after a query that started before the bridge settles', async () => {
    const { queryCache, devtools, installBridge, mountComponent } = factory(false)
    let resolveQuery!: (value: string) => void

    mountComponent(() =>
      useQuery({
        key: ['started-before-devtools'],
        query: () =>
          new Promise<string>((resolve) => {
            resolveQuery = resolve
          }),
      }),
    )
    await flushPromises()

    const entry = queryCache.getEntries({ key: ['started-before-devtools'], exact: true })[0]!
    expect(entry.asyncStatus.value).toBe('loading')

    installBridge()
    const settledUpdate = new Promise<Parameters<AppProcedures['queries:update']>[0]>((resolve) => {
      const off = devtools.on('queries:update', (payload) => {
        if (payload.keyHash === entry.keyHash && payload.asyncStatus === 'idle') {
          off()
          resolve(payload)
        }
      })
    })

    resolveQuery('done')
    const payload = await settledUpdate
    expect(payload.state).toEqual({ data: 'done', error: null, status: 'success' })
  })

  it('reports loading right away on mutation simulate even if a plugin delays asyncStatus', async () => {
    const { mutationCache, devtools, mountComponent } = factory()
    let mutate!: (vars: void) => void
    mountComponent(() => ({ mutate } = useMutation({ mutation: async () => 'ok' })))
    mutate()
    await flushPromises()

    const entry = mutationCache.getEntries()[0]!
    delayAsyncStatus(entry)
    // drain the updates queued by the mutation before subscribing
    await drainEmissions(devtools, 'mutations:update')

    const update = nextEmission(devtools, 'mutations:update')
    devtools.emit('mutations:simulate:loading', entry.id)
    const [payload] = await update
    expect(payload.asyncStatus).toBe('loading')
    expect(payload.devtools.simulate).toBe('loading')
  })

  it('reports idle after a mutation that started before the bridge settles', async () => {
    const { mutationCache, devtools, installBridge, mountComponent } = factory(false)
    let mutateAsync!: () => Promise<string>
    let resolveMutation!: (value: string) => void

    mountComponent(
      () =>
        ({ mutateAsync } = useMutation({
          mutation: () =>
            new Promise<string>((resolve) => {
              resolveMutation = resolve
            }),
        })),
    )
    const mutationPromise = mutateAsync()
    await flushPromises()

    const entry = mutationCache.getEntries()[0]!
    expect(entry.asyncStatus.value).toBe('loading')

    installBridge()
    const settledUpdate = new Promise<Parameters<AppProcedures['mutations:update']>[0]>(
      (resolve) => {
        const off = devtools.on('mutations:update', (payload) => {
          if (payload.id === entry.id && payload.asyncStatus === 'idle') {
            off()
            resolve(payload)
          }
        })
      },
    )

    resolveMutation('done')
    await mutationPromise
    const payload = await settledUpdate
    expect(payload.state).toEqual({ data: 'done', error: null, status: 'success' })
  })

  it('reports idle after an existing mutation fails', async () => {
    const { mutationCache, devtools, installBridge, mountComponent } = factory(false)
    let mutateAsync!: () => Promise<string>
    let rejectMutation!: (reason: Error) => void

    mountComponent(
      () =>
        ({ mutateAsync } = useMutation({
          mutation: () =>
            new Promise<string>((_, reject) => {
              rejectMutation = reject
            }),
        })),
    )
    const mutationPromise = mutateAsync()
    await flushPromises()

    const entry = mutationCache.getEntries()[0]!
    installBridge()
    const settledUpdate = new Promise<Parameters<AppProcedures['mutations:update']>[0]>(
      (resolve) => {
        const off = devtools.on('mutations:update', (payload) => {
          if (payload.id === entry.id && payload.asyncStatus === 'idle') {
            off()
            resolve(payload)
          }
        })
      },
    )

    rejectMutation(new Error('failed'))
    await expect(mutationPromise).rejects.toThrow('failed')
    const payload = await settledUpdate
    expect(payload.state.status).toBe('error')
  })
})
