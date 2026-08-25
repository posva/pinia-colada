import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, customRef, defineComponent } from 'vue'
import type { ShallowRef } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada, useMutation, useMutationCache, useQueryCache } from '@pinia/colada'
import type { AsyncStatus } from '@pinia/colada'
import { DuplexChannel } from '@pinia/colada-devtools/shared'
import type { AppEmits, DevtoolsEmits } from '@pinia/colada-devtools/shared'
import { setupDevtoolsAppBridge } from './app-bridge'

describe('app bridge', () => {
  enableAutoUnmount(afterEach)

  function factory() {
    const pinia = createPinia()
    // create the caches within an app context to avoid inject() warnings
    createApp({}).use(pinia).use(PiniaColada, {})
    const queryCache = useQueryCache(pinia)
    const mutationCache = useMutationCache(pinia)

    const mc = new MessageChannel()
    const transmitter = new DuplexChannel<AppEmits, DevtoolsEmits>(mc.port1)
    setupDevtoolsAppBridge(queryCache, mutationCache, transmitter)
    // the devtools end of the channel
    const devtools = new DuplexChannel<DevtoolsEmits, AppEmits>(mc.port2)

    return {
      queryCache,
      mutationCache,
      devtools,
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

  function nextEmission<K extends keyof AppEmits>(
    devtools: DuplexChannel<DevtoolsEmits, AppEmits>,
    event: K,
  ) {
    return new Promise<AppEmits[K]>((resolve) => {
      const off = devtools.on(event, (...args) => {
        off()
        resolve(args)
      })
    })
  }

  // waits until no emission of the given event arrives for a quiet window, so
  // updates queued by previous cache operations don't leak into assertions
  function drainEmissions<K extends keyof AppEmits>(
    devtools: DuplexChannel<DevtoolsEmits, AppEmits>,
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
})
