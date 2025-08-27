/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'
import { createSSRApp, defineComponent, onErrorCaptured } from 'vue'
import { renderToString, ssrRenderComponent, ssrRenderSuspense } from '@vue/server-renderer'
import type { UseQueryOptions } from './query-options'
import { isSpy } from '../test-utils/utils'
import { useQuery } from './use-query'
import { PiniaColada } from './pinia-colada'
import { createPinia } from 'pinia'

describe('SSR', () => {
  function renderApp<TData = number, TError = Error>({
    options = {},
    appSetup,
  }: {
    options?: Partial<UseQueryOptions<TData>>
    appSetup?: () => void
  } = {}) {
    const query = options.query
      ? isSpy(options.query)
        ? options.query
        : vi.fn(options.query)
      : vi.fn(async () => 42)

    const InnerComp = defineComponent({
      render: () => null,
      setup() {
        const useQueryResult = useQuery<TData, TError>({
          key: ['key'],
          ...options,
          // @ts-expect-error: generic unmatched but types work
          query,
        })
        return {
          ...useQueryResult,
        }
      },
    })
    const App = defineComponent({
      ssrRender(_ctx: any, push: any, _parent: any) {
        ssrRenderSuspense(push, {
          default: () => {
            push(ssrRenderComponent(InnerComp, null, null, _parent))
          },
          // @ts-expect-error: Vue type error?
          _: 1 /* STABLE */,
        })
      },

      setup() {
        appSetup?.()
        return {}
      },
    })

    const app = createSSRApp(App)
    const pinia = createPinia()
    app.use(pinia)
    app.use(PiniaColada, {})

    return {
      app,
      query,
      pinia,
    }
  }

  it('propagates query errors', async () => {
    // return false to stop the error from propagating
    const spy = vi.fn(() => false)
    const { app, query } = renderApp({
      appSetup() {
        onErrorCaptured(spy)
      },
    })
    query.mockRejectedValueOnce(new Error('ko'))
    expect(await renderToString(app)).toMatchInlineSnapshot(`"<!---->"`)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it.todo('can avoid throwing inside onServerPrefetch')
})
