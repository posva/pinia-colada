export function formatDuration(timeInMs: number): string {
  if (timeInMs < 1000) {
    return `${Math.round(timeInMs)} ms`
  }

  const seconds = timeInMs / 1000
  if (timeInMs < 10_000) {
    return `${seconds.toFixed(3)} seconds`
  }

  if (timeInMs < 60_000) {
    return `${Math.floor(seconds)} seconds`
  }

  const minutes = Math.floor(seconds / 60)

  if (timeInMs < 3_600_000) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`
  }

  const hours = Math.floor(minutes / 60)

  return `${hours}h${minutes % 60}m${seconds % 60}s`
}
