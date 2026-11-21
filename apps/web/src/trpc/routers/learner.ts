import { z } from 'zod'
import {
  attemptNumberSchema,
  completeLesson,
  completeLessonById,
  completeLessonSchema,
  completeTopic,
  completeTopicSchema,
  getAchievements,
  getAttemptDetail,
  historyListSchema,
  listHistory,
  getAssessmentView,
  getFoundationMap,
  getFoundationTopic,
  getLearnerDashboard,
  getLessonView,
  getQuizView,
  getResourceUrl,
  getTrackMap,
  getTrackTopic,
  setLessonCompletion,
  startAttempt,
  startQuizAttempt,
  submitAssessment,
  submitAssessmentSchema,
  submitQuizAnswer,
  submitQuizAnswerSchema,
  trackSlugSchema,
} from '@workspace/core'
import { createTRPCRouter, learnerProcedure, protectedProcedure } from '../init'

/**
 * Topic quizzes. Questions come without their answer key; grading happens only in `answer`, which is the
 * first response to reveal a correct answer, and only for the question just submitted.
 */
const quizRouter = createTRPCRouter({
  get: learnerProcedure
    .input(z.object({ quizId: z.uuid(), attempt: attemptNumberSchema.optional() }))
    .query(({ ctx, input }) => getQuizView(ctx.user.id, input.quizId, input.attempt)),

  /** Starts a new try (unlimited retries) or resumes the unfinished one. */
  start: learnerProcedure
    .input(z.object({ quizId: z.uuid() }))
    .mutation(({ ctx, input }) => startQuizAttempt(ctx.user.id, input.quizId)),

  answer: learnerProcedure
    .input(submitQuizAnswerSchema)
    .mutation(({ ctx, input }) => submitQuizAnswer({ userId: ctx.user.id, ...input })),
})

/**
 * Phase assessments. `get` never includes the answer key (correct answers appear only in submitted
 * history); `submit` grades the whole try on the server and is the only path that completes a phase.
 */
const assessmentRouter = createTRPCRouter({
  get: learnerProcedure
    .input(z.object({ assessmentId: z.uuid(), attempt: attemptNumberSchema.optional() }))
    .query(({ ctx, input }) => getAssessmentView(ctx.user.id, input.assessmentId, input.attempt)),

  submit: learnerProcedure
    .input(submitAssessmentSchema)
    .mutation(({ ctx, input }) => submitAssessment(ctx.user.id, input)),
})

/**
 * The session user's own enrollment history. Inputs only name an attempt id or a filter; ownership is
 * enforced in the queries, so another learner's attempt id simply returns nothing.
 */
const historyRouter = createTRPCRouter({
  list: protectedProcedure.input(historyListSchema).query(({ ctx, input }) => listHistory(ctx.user.id, input.filter, input.page)),

  attempt: protectedProcedure
    .input(z.object({ enrollmentId: z.uuid() }))
    .query(({ ctx, input }) => getAttemptDetail(ctx.user.id, input.enrollmentId)),
})

/**
 * Everything here runs for the session learner only (`ctx.user`); inputs name content, never people.
 * The core services re-check attempt ownership, course version, foundation completion and unlock rules.
 */
export const learnerRouter = createTRPCRouter({
  quiz: quizRouter,
  assessment: assessmentRouter,
  history: historyRouter,

  dashboard: learnerProcedure.query(({ ctx }) => getLearnerDashboard(ctx.user.id)),

  /**
   * The session user's own badge awards (read-only). There is deliberately no procedure that awards a
   * badge: awards are written only inside quiz and assessment pass transactions.
   */
  achievements: protectedProcedure.query(({ ctx }) => getAchievements(ctx.user.id)),

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

  /** Sidebar checkbox: check or uncheck a lesson on the live attempt. */
  setLessonCompletion: learnerProcedure
    .input(z.object({ lessonId: z.uuid(), done: z.boolean() }))
    .mutation(({ ctx, input }) => setLessonCompletion(ctx.user.id, input.lessonId, input.done)),

  completeTopic: learnerProcedure
    .input(completeTopicSchema)
    .mutation(({ ctx, input }) => completeTopic({ userId: ctx.user.id, ...input })),
})
