export type NestedValuePath = unknown[]

export function setNestedValue(obj: unknown, path: NestedValuePath, value: unknown): boolean {
  if (path.length === 0) return false

  let current = obj
  for (let index = 0; index < path.length - 1; index++) {
    current = getNestedValue(current, path[index])
    if (current == null || typeof current !== 'object') return false
  }

  const key = path.at(-1)
  if (current instanceof Map) {
    current.set(key, value)
    return true
  }

  if (current instanceof Set) {
    if (typeof key !== 'number' || !Number.isInteger(key) || key < 0 || key >= current.size) {
      return false
    }
    const values = Array.from(current)
    values[key] = value
    current.clear()
    for (const item of values) current.add(item)
    return true
  }

  if (current == null || typeof current !== 'object' || !isPropertyKey(key)) return false
  return Reflect.set(current, key, value)
}

function getNestedValue(value: unknown, key: unknown): unknown {
  if (value instanceof Map) return value.get(key)
  if (value instanceof Set) {
    return typeof key === 'number' && Number.isInteger(key) && key >= 0
      ? Array.from(value)[key]
      : undefined
  }
  if (value == null || typeof value !== 'object' || !isPropertyKey(key)) return undefined
  return Reflect.get(value, key)
}

function isPropertyKey(value: unknown): value is PropertyKey {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'symbol'
}
