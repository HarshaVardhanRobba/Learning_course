import { z } from 'zod'

export const completeLessonSchema = z.object({ courseId: z.uuid(), topicId: z.uuid(), lessonId: z.uuid() })
export const completeTopicSchema = z.object({ courseId: z.uuid(), topicId: z.uuid() })

/** Track slugs from the URL; anything else is treated as not found. */
export const trackSlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120)

/** Optional `?attempt=N` selecting one of the learner's own attempts. */
export const attemptNumberSchema = z.coerce.number().int().min(1).max(10_000)

export const lessonIdSchema = z.uuid()
