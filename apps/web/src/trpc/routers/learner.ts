import { z } from 'zod'
import {
  attemptNumberSchema,
  completeLesson,
  completeLessonById,
  completeLessonSchema,
  completeTopic,
  completeTopicSchema,
  getFoundationMap,
  getFoundationTopic,
  getLearnerDashboard,
  getLessonView,
  getResourceUrl,
  getTrackMap,
  getTrackTopic,
  startAttempt,
  trackSlugSchema,
} from '@workspace/core'
import { createTRPCRouter, learnerProcedure } from '../init'

/**
 * Everything here runs for the session learner only (`ctx.user`); inputs name content, never people.
 * The core services re-check attempt ownership, course version, foundation completion and unlock rules.
 */
export const learnerRouter = createTRPCRouter({
  dashboard: learnerProcedure.query(({ ctx }) => getLearnerDashboard(ctx.user.id)),

  foundationMap: learnerProcedure.query(({ ctx }) => getFoundationMap(ctx.user.id)),

  trackMap: learnerProcedure
    .input(z.object({ slug: trackSlugSchema, attempt: attemptNumberSchema.optional() }))
    .query(({ ctx, input }) => getTrackMap(ctx.user.id, input.slug, input.attempt)),

  foundationTopic: learnerProcedure
    .input(z.object({ topicId: z.uuid() }))
    .query(({ ctx, input }) => getFoundationTopic(ctx.user.id, input.topicId)),

  trackTopic: learnerProcedure
    .input(z.object({ slug: trackSlugSchema, topicId: z.uuid(), attempt: attemptNumberSchema.optional() }))
    .query(({ ctx, input }) => getTrackTopic(ctx.user.id, input.slug, input.topicId, input.attempt)),

  lesson: learnerProcedure
    .input(z.object({ lessonId: z.uuid(), attempt: attemptNumberSchema.optional() }))
    .query(({ ctx, input }) => getLessonView(ctx.user.id, input.lessonId, input.attempt)),

  /** Access-checked target for a lesson resource (short-lived presigned URL for private files). */
  resourceUrl: learnerProcedure
    .input(z.object({ resourceId: z.uuid() }))
    .query(({ ctx, input }) => getResourceUrl(ctx.user.id, input.resourceId)),

  startAttempt: learnerProcedure
    .input(z.object({ courseId: z.uuid(), replaceInProgress: z.boolean().default(false) }))
    .mutation(({ ctx, input }) => startAttempt({ userId: ctx.user.id, ...input })),

  completeLesson: learnerProcedure
    .input(completeLessonSchema)
    .mutation(({ ctx, input }) => completeLesson({ userId: ctx.user.id, ...input })),

  completeLessonById: learnerProcedure
    .input(z.object({ lessonId: z.uuid() }))
    .mutation(({ ctx, input }) => completeLessonById(ctx.user.id, input.lessonId)),

  completeTopic: learnerProcedure
    .input(completeTopicSchema)
    .mutation(({ ctx, input }) => completeTopic({ userId: ctx.user.id, ...input })),
})
