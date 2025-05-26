import type { UseQueryEntryPayload } from '../../../../src/devtools/query-serialized'

export type UseQueryEntryPayloadStatus =
  | 'loading'
  | 'fresh'
  | 'error'
  | 'stale'
  | 'pending'
  | 'unknown'

export function getQueryStatus(entry: UseQueryEntryPayload): UseQueryEntryPayloadStatus {
  if (entry.asyncStatus === 'loading') {
    return 'loading'
  }
  if (entry.state.status === 'error') {
    return 'error'
  }
  if (entry.state.status === 'pending') {
    return 'pending'
  }
  if (entry.stale) {
    return 'stale'
  }
  if (entry.state.status === 'success') {
    return 'fresh'
  }

  return 'unknown'
}

export const STATUS_COLOR_CLASSES: Record<
  UseQueryEntryPayloadStatus | 'inactive',
  {
    base: string
    clear: string
    text: string
  }
> = {
  loading: {
    base: 'bg-purple-400',
    clear: 'bg-purple-200',
    text: 'text-purple-100',
  },
  fresh: {
    base: 'bg-success-500',
    clear: 'bg-success-200',
    text: 'text-success-100',
  },
  error: {
    base: 'bg-error-500',
    clear: 'bg-error-200',
    text: 'text-error-100',
  },
  stale: {
    base: 'bg-info-500',
    clear: 'bg-info-200',
    text: 'text-info-100',
  },
  pending: {
    base: 'bg-warning-500',
    clear: 'bg-warning-200',
    text: 'text-warning-100',
  },
  inactive: {
    base: 'bg-neutral-400',
    clear: 'bg-neutral-200',
    text: 'text-neutral-100',
  },
  unknown: {
    base: 'bg-gray-400',
    clear: 'bg-gray-200',
    text: 'text-gray-100',
  },
}
