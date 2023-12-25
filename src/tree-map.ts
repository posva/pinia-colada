export type EntryNodeKey = string | number

export class EntryNode<T> {
  value: T | undefined
  children = new Map<string | number, EntryNode<T>>()

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
      const node: EntryNode<T> | undefined = this.children.get(top)
      if (node) {
        node.set(otherKeys, value)
      } else {
        this.children.set(top, new EntryNode(otherKeys, value))
      }
    }
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
      const node = this.children.get(top)
      if (node) {
        node.delete(otherKeys)
      }
    }
  }
}
