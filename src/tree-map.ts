import { type _JSONPrimitive } from './utils'

export type EntryNodeKey = _JSONPrimitive

/**
 * Internal data structure used to store the data of `useQuery()`.
 * @internal
 */
export class TreeMapNode<T = unknown> {
  value: T | undefined
  children = new Map<EntryNodeKey, TreeMapNode<T>>()

  constructor()
  constructor(keys: EntryNodeKey[], value: T)
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
  set(keys: EntryNodeKey[], value: T) {
    if (keys.length === 0) {
      this.value = value
    } else {
      // this.children ??= new Map<EntryNodeKey,
      const [top, ...otherKeys] = keys
      const node: TreeMapNode<T> | undefined = this.children.get(top)
      if (node) {
        node.set(otherKeys, value)
      } else {
        this.children.set(top, new TreeMapNode(otherKeys, value))
      }
    }
  }

  /**
   * Finds the node at the given path of keys.
   *
   * @param keys - path of keys
   */
  find(keys: EntryNodeKey[]): TreeMapNode<T> | undefined {
    if (keys.length === 0) {
      return this
    } else {
      const [top, ...otherKeys] = keys
      return this.children.get(top)?.find(otherKeys)
    }
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
   * Delete the node at the given path of keys and all its children.
   *
   * @param keys - path of keys
   */
  delete(keys: EntryNodeKey[]) {
    if (keys.length === 1) {
      this.children.delete(keys[0])
    } else {
      const [top, ...otherKeys] = keys
      this.children.get(top)?.delete(otherKeys)
    }
  }

  /**
   * Iterates over the node values if not null or undefined and all its children. Goes in depth first order.
   */
  *[Symbol.iterator](): IterableIterator<T> {
    if (this.value != null) {
      yield this.value
    }
    for (const child of this.children.values()) {
      yield* child
    }
  }
}

// Below are debugging internals

/**
 * Calculates the size of the node and all its children. Used in tests.
 *
 * @internal
 * @param node - The node to calculate the size of
 * @returns The size of the node and all its children
 */
export function entryNodeSize(node: TreeMapNode): number {
  return (
    node.children.size +
    [...node.children.values()].reduce(
      (acc, child) => acc + entryNodeSize(child),
      0
    )
  )
}

export function logTree(
  tree: TreeMapNode,
  log: (str: string) => any = console.log
) {
  log(printTreeMap(tree))
}

const MAX_LEVEL = 1000
function printTreeMap(
  tree: TreeMapNode | TreeMapNode['children'],
  level = 0,
  parentPre = '',
  treeStr = ''
): string {
  // end of recursion
  if (typeof tree !== 'object' || level >= MAX_LEVEL) return ''

  if (tree instanceof Map) {
    const total = tree.size
    let index = 0
    for (const [key, child] of tree) {
      const hasNext = index++ < total - 1
      const { children } = child

      treeStr += `${`${parentPre}${hasNext ? '├' : '└'}${
        '─' + (children.size > 0 ? '┬' : '')
      } `}${key}${child.value != null ? ' · ' + String(child.value) : ''}\n`

      if (children) {
        treeStr += printTreeMap(
          children,
          level + 1,
          `${parentPre}${hasNext ? '│' : ' '} `
        )
      }
    }
  } else {
    const children = tree.children
    treeStr = `${String(tree.value ?? '<root>')}\n`
    if (children) {
      treeStr += printTreeMap(children, level + 1)
    }
  }

  return treeStr
}
