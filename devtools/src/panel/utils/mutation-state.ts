import type { UseMutationEntryPayload } from '@pinia/colada-devtools/shared'

export type UseMutationEntryPayloadStatus = 'loading' | 'success' | 'error' | 'pending' | 'idle'

export function getMutationStatus(entry: UseMutationEntryPayload): UseMutationEntryPayloadStatus {
  if (entry.asyncStatus === 'loading') {
    return 'loading'
  }

  if (entry.state.status === 'error') {
    return 'error'
  }

  if (entry.state.status === 'success') {
    return 'success'
  }

  if (entry.state.status === 'pending') {
    return 'pending'
  }

  return 'idle'
}

export const STATUS_COLOR_CLASSES: Record<
  UseMutationEntryPayloadStatus,
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
  success: {
    base: 'bg-success-500',
    clear: 'bg-success-200',
    text: 'text-success-100',
  },
  error: {
    base: 'bg-error-500',
    clear: 'bg-error-200',
    text: 'text-error-100',
  },
  pending: {
    base: 'bg-warning-500',
    clear: 'bg-warning-200',
    text: 'text-warning-100',
  },
  idle: {
    base: 'bg-neutral-400',
    clear: 'bg-neutral-200',
    text: 'text-neutral-100',
  },
}
