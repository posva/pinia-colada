import type { UseQueryOptionsWithDefaults } from './query-options'

/**
 * Key type for nodes in the tree map. Differently from {@link EntryKey}, this type is serializable to JSON.
 */
export type EntryNodeKey = string | number

/**
 * Internal data structure used to store the data of `useQuery()`. `T` should be serializable to JSON.
 *
 * @internal
 */
export class TreeMapNode<T = unknown> {
  value: T | undefined
  // TODO: test if more performant to always have a children property (start as null)
  children?: Map<EntryNodeKey, this>
  parent: this | null | undefined

  /**
   * Creates the root node of the tree.
   */
  constructor()
  /**
   * Creates a node with the given keys and value.
   */
  constructor(keys: EntryNodeKey[], value: T | undefined)
  constructor(...args: [] | [EntryNodeKey[], T]) {
    if (args.length) {
      this.set(...args)
    }
  }

  /**
   * Sets the value while building the tree
   *
   * @param keys - key as an array
   * @param value - value to set
   */
  set([top, ...otherKeys]: EntryNodeKey[], value?: T) {
    if (!top) {
      this.value = value
      if (value == null) {
        // free up unused tree
        // eslint-disable-next-line ts/no-this-alias
        let currentNode: this | undefined | null = this
        while (currentNode?.isEmpty()) {
          currentNode.children?.clear()
          currentNode = currentNode.parent
        }
      }
    } else {
      let node: this | undefined = this.children?.get(top)
      if (node) {
        node.set(otherKeys, value)
      } else {
        this.children ??= new Map()
        node = new (this.constructor as new (keys: EntryNodeKey[], value: T | undefined) => this)(
          otherKeys,
          value,
        )
        node.parent = this
        this.children.set(top, node)
      }
    }
  }

  /**
   * Returns whether the node and all its children are empty.
   */
  isEmpty(): boolean {
    return this.value == null && (this.children?.values() || []).every((child) => child.isEmpty())
  }

  /**
   * Finds the node at the given path of keys.
   *
   * @param keys - path of keys
   */
  find([top, ...otherKeys]: EntryNodeKey[]): this | undefined {
    return top ? this.children?.get(top)?.find(otherKeys) : this
  }

  /**
   * Gets the value at the given path of keys.
   *
   * @param keys - path of keys
   */
  get(keys: EntryNodeKey[]): T | undefined {
    return this.find(keys)?.value
  }

  /**
   * Iterates over the node values if not null or undefined and all its
   * children. Goes in depth first order. Allows a `for (const of node)` loop.
   */
  * [Symbol.iterator](): IterableIterator<T> {
    if (this.value != null) {
      yield this.value
    }
    if (this.children) {
      for (const child of this.children.values()) {
        yield *child
      }
    }
  }
}

export class TreeMapMultiNode<T = unknown> extends TreeMapNode<T[]> {
  /**
   * Sets the value while building the tree
   *
   * @param keys - key as an array
   * @param values - values to add
   */
  override set(keys: EntryNodeKey[], values: T[] = []) {
    if (keys.length === 0) {
      this.value ??= []
      this.value.push(...values)
    } else {
      // TODO: does it call the overriden set when recursive?
      // super.set(keys, values)
      // TODO: super.set() instead of all this code
      // this.children ??= new Map<EntryNodeKey,
      const [top, ...otherKeys] = keys as [top: EntryNodeKey, ...otherKeys: EntryNodeKey[]]
      const node: this | undefined = this.children?.get(top)
      if (node) {
        node.set(otherKeys, values)
      } else {
        this.children ??= new Map()
        this.children.set(top, new TreeMapMultiNode<T>(otherKeys, values) as this)
      }
    }
  }

  // /**
  //  * Deletes the value at a given node of the tree and if the array is empty, deletes the node.
  //  *
  //  * @param keys - key as an array
  //  * @param value - value to delete
  //  */
  // override delete(keys: EntryNodeKey[], value?: T) {
  //   if (!value) {
  //     throw new Error('Cannot delete a value without specifying the value to delete')
  //   }
  //
  //   if (keys.length === 1) {
  //     const node = this.children?.get(keys[0]!)
  //     if (node) {
  //       node.value = node.value?.filter((v) => v !== value)
  //       if (node.value?.length === 0) {
  //         this.children?.delete(keys[0]!)
  //       }
  //     }
  //   } else {
  //     const [top, ...otherKeys] = keys as [top: EntryNodeKey, ...otherKeys: EntryNodeKey[]]
  //     this.children?.get(top)?.delete(otherKeys, value)
  //   }
  // }
}

// NOTE: this function is outside of TreeMapNode because it's only needed for SSR apps and shouldn't add to the bundle
// size if they are client only
/**
 * Revives and appends a serialized node to the tree.
 *
 * @param parent - parent node
 * @param serializedEntryNode serialized entry
 * @param serializedEntryNode.0 entry key
 * @param serializedEntryNode.1 entry data value
 * @param serializedEntryNode.2 entry children
 * @param createNodeValue - function to create the node value
 * @param parentKey parent key
 */
export function appendSerializedNodeToTree<T>(
  parent: TreeMapNode<T>,
  [key, value, children]: UseQueryEntryNodeSerialized,
  createNodeValue: (
    key: EntryNodeKey[],
    options?: UseQueryOptionsWithDefaults<unknown, unknown> | null,
    initialData?: unknown,
    error?: unknown | null,
    when?: number,
  ) => T,
  parentKey: EntryNodeKey[] = [],
) {
  parent.children ??= new Map()
  const entryKey = [...parentKey, key]
  const node = new TreeMapNode<T>(
    [],
    // NOTE: this could happen outside of an effect scope but since it's only for client side hydration, it should be
    // fine to have global shallowRefs as they can still be cleared when needed
    value && createNodeValue(entryKey, null, ...value),
  )
  parent.children.set(key, node)
  if (children) {
    for (const child of children) {
      appendSerializedNodeToTree(node, child, createNodeValue, entryKey)
    }
  }
}

/**
 * Raw data of a query entry. Can be serialized from the server and used to hydrate the store.
 * @internal
 */
export type _UseQueryEntryNodeValueSerialized<TResult = unknown, TError = unknown> = [
  /**
   * The data returned by the query.
   */
  data: TResult | undefined,

  /**
   * The error thrown by the query.
   */
  error: TError | null,

  /**
   * When was this data fetched the last time in ms
   */
  when?: number,
]

/**
 * Serialized version of a query entry node.
 * @internal
 */
export type UseQueryEntryNodeSerialized = [
  key: EntryNodeKey,
  value: undefined | _UseQueryEntryNodeValueSerialized,
  children?: UseQueryEntryNodeSerialized[],
]

// -------------------------------------
// --- Below are debugging internals ---
// -------------------------------------
/* v8 ignore start */

/**
 * Calculates the size of the node and all its children. Used in tests.
 *
 * @internal
 * @param node - The node to calculate the size of
 * @returns The size of the node and all its children
 */
export function entryNodeSize(node: TreeMapNode): number {
  return (
    (node.children?.size ?? 0)
    + [...(node.children?.values() || [])].reduce((acc, child) => acc + entryNodeSize(child), 0)
  )
}

/**
 * Logs the tree to the console. Used in tests.
 * @internal
 *
 * @param tree - tree to log
 * @param log - function to log the tree
 */
export function logTree(
  tree: TreeMapNode,

  log: (str: string) => any = console.log,
) {
  log(printTreeMap(tree))
}

const MAX_LEVEL = 1000
function printTreeMap(
  tree: TreeMapNode | TreeMapNode['children'],
  level = 0,
  parentPre = '',
  treeStr = '',
): string {
  // end of recursion
  if (typeof tree !== 'object' || level >= MAX_LEVEL) return ''

  if (tree instanceof Map) {
    const total = tree.size
    let index = 0
    for (const [key, child] of tree) {
      const hasNext = index++ < total - 1
      const { children } = child

      treeStr += `${`${parentPre}${hasNext ? '├' : '└'}${`─${(children?.size ?? 0) > 0 ? '┬' : ''}`} `}${key}${child.value != null ? ` · ${String(child.value)}` : ''}\n`

      if (children) {
        treeStr += printTreeMap(children, level + 1, `${parentPre}${hasNext ? '│' : ' '} `)
      }
    }
  } else {
    const children = tree.children
    treeStr = `${String(
      typeof tree.value === 'object' && tree.value ? JSON.stringify(tree.value) : '<root>',
    )}\n`
    if (children) {
      treeStr += printTreeMap(children, level + 1)
    }
  }

  return treeStr
}
/* v8 ignore stop */
