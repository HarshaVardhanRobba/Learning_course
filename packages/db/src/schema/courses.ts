import { sql } from 'drizzle-orm'
import { check, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

/**
 * `foundation` is the common course every learner finishes first. A `track` is a role-specific course
 * (e.g. Java Full Stack Developer) inside a stream, and stays locked until the foundation is complete.
 */
export const courseKind = pgEnum('course_kind', ['foundation', 'track'])

/** Groups tracks, e.g. Full Stack, Infrastructure, Data, Cyber Security. */
export const streams = pgTable('streams', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Only `published` versions are shown to learners. `archived` versions stop taking new attempts but keep existing ones readable. */
export const courseVersionStatus = pgEnum('course_version_status', ['draft', 'published', 'archived'])

export const courses = pgTable(
  'courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    kind: courseKind('kind').notNull(),
    /** Null only for the foundation; tracks without a stream are not shown to learners. */
    streamId: uuid('stream_id').references(() => streams.id, { onDelete: 'restrict' }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Exactly one foundation course: track unlocking depends on it.
    uniqueIndex('courses_single_foundation').on(table.kind).where(sql`${table.kind} = 'foundation'`),
    check('courses_foundation_has_no_stream', sql`${table.kind} <> 'foundation' or ${table.streamId} is null`),
  ],
)

/** Content is versioned so an attempt keeps measuring progress against the version it started on. */
export const courseVersions = pgTable(
  'course_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    status: courseVersionStatus('status').notNull().default('draft'),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('course_versions_course_version_unique').on(table.courseId, table.version)],
)

export const phases = pgTable(
  'phases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseVersionId: uuid('course_version_id')
      .notNull()
      .references(() => courseVersions.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    title: text('title').notNull(),
  },
  (table) => [uniqueIndex('phases_version_position_unique').on(table.courseVersionId, table.position)],
)

export const topics = pgTable(
  'topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phaseId: uuid('phase_id')
      .notNull()
      .references(() => phases.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    title: text('title').notNull(),
    /** What to learn in this topic. */
    description: text('description').notNull().default(''),
  },
  (table) => [uniqueIndex('topics_phase_position_unique').on(table.phaseId, table.position)],
)

/** The lessons a learner covers inside a topic, in order. `content` is filled in later. */
export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull().default(''),
  },
  (table) => [uniqueIndex('lessons_topic_position_unique').on(table.topicId, table.position)],
)

export type Stream = typeof streams.$inferSelect
export type Course = typeof courses.$inferSelect
export type CourseKind = (typeof courseKind.enumValues)[number]
export type CourseVersion = typeof courseVersions.$inferSelect
export type CourseVersionStatus = (typeof courseVersionStatus.enumValues)[number]
export type Phase = typeof phases.$inferSelect
export type Topic = typeof topics.$inferSelect
export type Lesson = typeof lessons.$inferSelect
