import { expectTypeOf } from 'vitest'
import type { ComputedRef } from 'vue'
import { useMutationState } from './use-mutation-state'
import type { UseMutationEntry } from './mutation-store'

// Test basic usage without filters
const { data: allMutations } = useMutationState()
expectTypeOf(allMutations).toEqualTypeOf<ComputedRef<UseMutationEntry[]>>()

// Test with filters only
const { data: filteredMutations } = useMutationState({ status: 'success' })
expectTypeOf(filteredMutations).toEqualTypeOf<ComputedRef<UseMutationEntry[]>>()

// Test with options object and no select
const { data: filteredMutations2 } = useMutationState({ filters: { status: 'error' } })
expectTypeOf(filteredMutations2).toEqualTypeOf<ComputedRef<UseMutationEntry[]>>()

// Test with select function
const { data: selectedData } = useMutationState({
  filters: { status: 'success' },
  select: (entry) => entry.state.value.data,
})
expectTypeOf(selectedData).toEqualTypeOf<ComputedRef<unknown[]>>()

// Test with typed select function
const { data: typedSelectedData } = useMutationState({
  filters: { status: 'success' },
  select: (entry): string => entry.id,
})
expectTypeOf(typedSelectedData).toEqualTypeOf<ComputedRef<string[]>>()