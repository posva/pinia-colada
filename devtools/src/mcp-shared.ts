import type { EntryKey, UseQueryEntryFilter } from '@pinia/colada'
import { z } from 'zod'

/**
 * Schema for {@link EntryKey}
 */
export const entryKeySchema = z
  .array(z.json())
  .describe('A Pinia Colada query key represented as JSON-serializable segments.')

export type DevtoolsMcpEntryKey = z.infer<typeof entryKeySchema>

export const entryKeyListSchema = z
  .array(entryKeySchema)
  .describe('List of entry keys that matched an operation.')

/**
 * Schema for {@link UseQueryEntryFilter}
 */
export const entryFiltersSchema = z
  .strictObject({
    key: entryKeySchema
      .describe('Match queries whose key starts with these segments unless exact is true.')
      .optional(),
    exact: z.boolean().describe('Require the complete query key to match.').optional(),
    stale: z
      .boolean()
      .nullable()
      .describe('Match only stale or fresh queries; null applies no stale filter.')
      .optional(),
    active: z
      .boolean()
      .nullable()
      .describe('Match only active or inactive queries; null applies no active filter.')
      .optional(),
    status: z
      .enum(['pending', 'success', 'error'])
      .nullable()
      .describe('Match queries by their current data status; null applies no status filter.')
      .optional(),
  })
  .describe('Pinia Colada query filters. Use an empty object to match every query.')

export type DevtoolsMcpQueryFilter = z.infer<typeof entryFiltersSchema>

export const mutationIdSchema = z
  .number()
  .int()
  .positive()
  .describe('The ID of a cached Pinia Colada mutation.')

export const mutationIdListSchema = z
  .array(mutationIdSchema)
  .describe('IDs of mutations affected by an operation. Empty if no mutations were affected.')

export const mutationFiltersSchema = z
  .strictObject({
    key: entryKeySchema
      .describe('Match mutations whose key starts with these segments.')
      .optional(),
    status: z
      .enum(['pending', 'success', 'error'])
      .nullable()
      .describe('Match mutations by their current data status; null applies no status filter.')
      .optional(),
  })
  .describe('Pinia Colada mutation filters. Use an empty object to match every mutation.')

export const queryStateSchema = z
  .discriminatedUnion('status', [
    z.strictObject({ status: z.literal('pending'), data: z.unknown(), error: z.null() }),
    z.strictObject({ status: z.literal('success'), data: z.unknown(), error: z.null() }),
    z.strictObject({ status: z.literal('error'), data: z.unknown(), error: z.unknown() }),
  ])
  .describe('Query state. Data and errors can contain rich values restored by the channel codec.')
