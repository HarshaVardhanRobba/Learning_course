import { z } from 'zod'

export const historyFilterSchema = z.enum(['all', 'foundation', 'tracks', 'in_progress', 'completed'])
export type HistoryFilter = z.infer<typeof historyFilterSchema>

export const historyListSchema = z.object({
  filter: historyFilterSchema.default('all'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
})
