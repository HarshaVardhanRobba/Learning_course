import { z } from 'zod'

export const startAttemptSchema = z.object({
  courseId: z.uuid(),
  /** Form value "1" means the learner confirmed replacing their live attempt. */
  replaceInProgress: z.enum(['0', '1']).default('0').transform((v) => v === '1'),
})

export type StartAttemptInput = z.infer<typeof startAttemptSchema>
