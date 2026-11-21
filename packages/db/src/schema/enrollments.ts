import { sql } from 'drizzle-orm'
import { check, integer, pgEnum, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { courses, courseVersions, lessons, topics } from './courses'
import { users } from './users'

/** `abandoned` attempts are kept, never deleted, so a learner's earlier work stays in their history. */
export const enrollmentStatus = pgEnum('enrollment_status', ['in_progress', 'completed', 'abandoned'])

/** One row per attempt. A new attempt is a new row; earlier attempts and their completions are preserved. */
export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Denormalized from the version so attempts can be numbered and constrained per course. */
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    courseVersionId: uuid('course_version_id')
      .notNull()
      .references(() => courseVersions.id, { onDelete: 'restrict' }),
    attemptNumber: integer('attempt_number').notNull(),
    status: enrollmentStatus('status').notNull().default('in_progress'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    /** Set when the attempt leaves `in_progress` (completed or abandoned). */
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('enrollments_user_course_attempt_unique').on(table.userId, table.courseId, table.attemptNumber),
    // At most one live attempt per course; this is the guard against double-starts.
    uniqueIndex('enrollments_one_in_progress')
      .on(table.userId, table.courseId)
      .where(sql`${table.status} = 'in_progress'`),
    check(
      'enrollments_ended_at_check',
      sql`(${table.status} = 'in_progress' and ${table.endedAt} is null) or (${table.status} <> 'in_progress' and ${table.endedAt} is not null)`,
    ),
    check('enrollments_attempt_number_check', sql`${table.attemptNumber} >= 1`),
  ],
)

/**
 * A completed topic for one attempt. A topic counts as completed when its topic quiz is passed;
 * phase assessments and track unlocking are measured from these rows.
 */
export const topicCompletions = pgTable(
  'topic_completions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('topic_completions_enrollment_topic_unique').on(table.enrollmentId, table.topicId)],
)

/** Lessons the learner has covered in an attempt; any covered lesson puts its topic in progress. */
export const lessonCompletions = pgTable(
  'lesson_completions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('lesson_completions_enrollment_lesson_unique').on(table.enrollmentId, table.lessonId)],
)

export type Enrollment = typeof enrollments.$inferSelect
export type EnrollmentStatus = (typeof enrollmentStatus.enumValues)[number]
export type TopicCompletion = typeof topicCompletions.$inferSelect
export type LessonCompletion = typeof lessonCompletions.$inferSelect
