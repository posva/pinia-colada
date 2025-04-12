import type { StandardSchemaV1 } from '@standard-schema/spec'
import * as z from 'zod'

class RPC<
  Emits extends Record<string, StandardSchemaV1<[...any[]], [...any[]]>>,
  Listens extends Record<string, StandardSchemaV1<[...any[]], [...any[]]>>,
> {
  constructor(
    protected emits: Emits,
    protected listens: Listens,
  ) {}

  emit<K extends keyof Emits>(event: K, ...args: StandardSchemaV1.InferInput<Emits[K]>): void {
    const schema = this.emits[event]
    if (!schema) {
      throw new Error(`Event "${String(event)}" not found`)
    }
    const data = schema['~standard'].validate(args)
    if (data instanceof Promise) {
      throw new TypeError(`Validator for event "${String(event)}" is async but must be sync.`)
    }
    if (data.issues) {
      console.error(`RPC: invalid data in event "${String(event)}"`, data.issues)
      return
    }
    console.log(data.value)
  }

  on<K extends keyof Listens>(
    event: K,
    callback: (...args: StandardSchemaV1.InferOutput<Listens[K]>) => void,
  ): () => void {
    const schema = this.listens[event]
    if (!schema) {
      throw new Error(`Event "${String(event)}" not found`)
    }
    // TODO: on some event
    async function handleData(data: unknown) {
      const parsed = await schema!['~standard'].validate(data)
      if (parsed.issues) {
        console.error(`RPC: invalid data in event "${String(event)}"`, parsed.issues)
      } else {
        callback(...parsed.value)
      }
    }

    handleData({}) // TODO: remove this line

    // return unlisten
    return () => {}
  }
}

const appEmits = {
  'queries:all': z.tuple([
    z.array(
      z.object({
        id: z.string(),
      }),
    ),
  ]),
} satisfies Record<string, StandardSchemaV1<[...any[]], [...any[]]>>

// const [queriesAll] = appEmits['queries:all'].parse({})
// Promise.resolve(appEmits['queries:all']['~standard'].validate({})).then((data) => {})
// type T1 = StandardSchemaV1.InferOutput<(typeof appEmits)['queries:all']>
// type T2 = StandardSchemaV1.InferInput<(typeof appEmits)['queries:all']>
// console.log('id', queriesAll.at(0)?.id)

const devtoolsEmits = {
  'queries:clear': z.union([
    z.tuple([]),
    z.tuple([
      z.object({
        key: z.string().optional().nullable(), // TODO: fix
      }),
    ]),
  ]),
} satisfies Record<string, StandardSchemaV1>

// the app
const client = new RPC(appEmits, devtoolsEmits)
// the devtools
const server = new RPC(devtoolsEmits, appEmits)

client.emit('queries:all', [])
client.emit('queries:all', [{ id: '' }])
client.on('queries:clear', () => {})
client.on('queries:clear', (filters = {}) => {
  console.log(filters.key)
  // ...
})

server.emit('queries:clear')
server.emit('queries:clear', { key: '' })
