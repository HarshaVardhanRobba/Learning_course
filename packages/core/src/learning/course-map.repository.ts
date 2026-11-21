import 'server-only'
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import {
  courses,
  courseVersions,
  enrollments,
  getDb,
  lessonCompletions,
  lessonResources,
  lessons,
  phaseAssessments,
  phaseCompletions,
  phases,
  topicCompletions,
  topics,
  type CourseKind,
  type Enrollment,
  type Executor,
} from '@workspace/db'
import type { AttemptActivity, VersionContent } from './course-map'

export type AttemptWithCourse = Enrollment & {
  kind: CourseKind
  courseSlug: string
  version: number
  versionTitle: string
  versionSummary: string
}

const attemptColumns = {
  enrollment: enrollments,
  kind: courses.kind,
  courseSlug: courses.slug,
  version: courseVersions.version,
  versionTitle: courseVersions.title,
  versionSummary: courseVersions.summary,
}

type AttemptRow = { enrollment: Enrollment; kind: CourseKind; courseSlug: string; version: number; versionTitle: string; versionSummary: string }

function toAttempt(row: AttemptRow): AttemptWithCourse {
  const { enrollment, ...rest } = row
  return { ...enrollment, ...rest }
}

/**
 * One of the learner's attempts on a course: the given attempt number, otherwise the live attempt,
 * otherwise the most recent. Pass the session-resolved user id only. With `forUpdate`, the row is
 * locked for the rest of the transaction so concurrent completions serialize.
 */
export async function findCourseAttempt(
  userId: string,
  courseId: string,
  executor: Executor = getDb(),
  options: { attemptNumber?: number; liveOnly?: boolean; forUpdate?: boolean } = {},
): Promise<AttemptWithCourse | null> {
  const query = executor
    .select(attemptColumns)
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .innerJoin(courseVersions, eq(courseVersions.id, enrollments.courseVersionId))
    .where(
      and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, courseId),
        options.attemptNumber !== undefined ? eq(enrollments.attemptNumber, options.attemptNumber) : undefined,
        options.liveOnly ? eq(enrollments.status, 'in_progress') : undefined,
      ),
    )
    .orderBy(sql`case when ${enrollments.status} = 'in_progress' then 0 else 1 end`, desc(enrollments.startedAt))
    .limit(1)
  const [row] = options.forUpdate ? await query.for('update', { of: enrollments }) : await query
  return row ? toAttempt(row) : null
}

/** Every attempt the learner has made on a course, newest first. */
export async function findCourseAttempts(userId: string, courseId: string, executor: Executor = getDb()): Promise<AttemptWithCourse[]> {
  const rows = await executor
    .select(attemptColumns)
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .innerJoin(courseVersions, eq(courseVersions.id, enrollments.courseVersionId))
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
    .orderBy(desc(enrollments.attemptNumber))
  return rows.map(toAttempt)
}

export type CourseRef = { id: string; slug: string; kind: CourseKind; streamId: string | null }

export async function findCourseRef(where: { id?: string; slug?: string; kind?: CourseKind }, executor: Executor = getDb()): Promise<CourseRef | null> {
  const [row] = await executor
    .select({ id: courses.id, slug: courses.slug, kind: courses.kind, streamId: courses.streamId })
    .from(courses)
    .where(
      and(
        where.id ? eq(courses.id, where.id) : undefined,
        where.slug ? eq(courses.slug, where.slug) : undefined,
        where.kind ? eq(courses.kind, where.kind) : undefined,
      ),
    )
    .limit(1)
  return row ?? null
}

/** Phases, topics and lessons of exactly one course version: the one the attempt is assigned to. */
export async function findVersionContent(courseVersionId: string, executor: Executor = getDb()): Promise<VersionContent> {
  const [phaseRows, topicRows, lessonRows, assessmentRows] = await Promise.all([
    executor
      .select({ id: phases.id, position: phases.position, title: phases.title })
      .from(phases)
      .where(eq(phases.courseVersionId, courseVersionId))
      .orderBy(asc(phases.position)),
    executor
      .select({
        id: topics.id,
        phaseId: topics.phaseId,
        position: topics.position,
        title: topics.title,
        description: topics.description,
      })
      .from(topics)
      .innerJoin(phases, eq(phases.id, topics.phaseId))
      .where(eq(phases.courseVersionId, courseVersionId)),
    executor
      .select({
        id: lessons.id,
        topicId: lessons.topicId,
        position: lessons.position,
        title: lessons.title,
        content: lessons.content,
        contentFormat: lessons.contentFormat,
        videoUid: lessons.videoUid,
        durationSeconds: lessons.durationSeconds,
      })
      .from(lessons)
      .innerJoin(topics, eq(topics.id, lessons.topicId))
      .innerJoin(phases, eq(phases.id, topics.phaseId))
      .where(eq(phases.courseVersionId, courseVersionId)),
    executor
      .select({ id: phaseAssessments.id, phaseId: phaseAssessments.phaseId })
      .from(phaseAssessments)
      .innerJoin(phases, eq(phases.id, phaseAssessments.phaseId))
      .where(eq(phases.courseVersionId, courseVersionId)),
  ])
  return { phases: phaseRows, topics: topicRows, lessons: lessonRows, assessments: assessmentRows }
}

/** Progress rows for one attempt. Rows are only ever written for content of the attempt's own version. */
export async function findAttemptActivity(enrollmentId: string, executor: Executor = getDb()): Promise<AttemptActivity> {
  const [lessonRows, topicRows, phaseRows] = await Promise.all([
    executor
      .select({ lessonId: lessonCompletions.lessonId, completedAt: lessonCompletions.completedAt })
      .from(lessonCompletions)
      .where(eq(lessonCompletions.enrollmentId, enrollmentId)),
    executor
      .select({ topicId: topicCompletions.topicId, completedAt: topicCompletions.completedAt })
      .from(topicCompletions)
      .where(eq(topicCompletions.enrollmentId, enrollmentId)),
    executor
      .select({ phaseId: phaseCompletions.phaseId, completedAt: phaseCompletions.completedAt })
      .from(phaseCompletions)
      .where(eq(phaseCompletions.enrollmentId, enrollmentId)),
  ])
  return { lessonCompletions: lessonRows, topicCompletions: topicRows, phaseCompletions: phaseRows }
}

export type LessonLocation = { lessonId: string; topicId: string; courseVersionId: string; courseId: string }

/** Where a lesson lives: its topic, the course version that topic belongs to, and the course. */
export async function findLessonLocation(lessonId: string, executor: Executor = getDb()): Promise<LessonLocation | null> {
  const [row] = await executor
    .select({ lessonId: lessons.id, topicId: topics.id, courseVersionId: phases.courseVersionId, courseId: courseVersions.courseId })
    .from(lessons)
    .innerJoin(topics, eq(topics.id, lessons.topicId))
    .innerJoin(phases, eq(phases.id, topics.phaseId))
    .innerJoin(courseVersions, eq(courseVersions.id, phases.courseVersionId))
    .where(eq(lessons.id, lessonId))
    .limit(1)
  return row ?? null
}

export async function findLessonResources(lessonId: string, executor: Executor = getDb()) {
  return executor
    .select({
      id: lessonResources.id,
      title: lessonResources.title,
      kind: lessonResources.kind,
      url: lessonResources.url,
      r2Key: lessonResources.r2Key,
    })
    .from(lessonResources)
    .where(eq(lessonResources.lessonId, lessonId))
    .orderBy(asc(lessonResources.position))
}

export async function findResourceById(resourceId: string, executor: Executor = getDb()) {
  const [row] = await executor
    .select({ id: lessonResources.id, lessonId: lessonResources.lessonId, kind: lessonResources.kind, url: lessonResources.url, r2Key: lessonResources.r2Key })
    .from(lessonResources)
    .where(eq(lessonResources.id, resourceId))
    .limit(1)
  return row ?? null
}

/** Content of several versions in four queries, grouped by version id (dashboard progress). */
export async function findVersionContents(versionIds: string[], executor: Executor = getDb()): Promise<Map<string, VersionContent>> {
  const result = new Map<string, VersionContent>(versionIds.map((id) => [id, { phases: [], topics: [], lessons: [], assessments: [] }]))
  if (!versionIds.length) return result
  const [phaseRows, topicRows, lessonRows, assessmentRows] = await Promise.all([
    executor
      .select({ id: phases.id, position: phases.position, title: phases.title, versionId: phases.courseVersionId })
      .from(phases)
      .where(inArray(phases.courseVersionId, versionIds)),
    executor
      .select({
        id: topics.id,
        phaseId: topics.phaseId,
        position: topics.position,
        title: topics.title,
        description: topics.description,
        versionId: phases.courseVersionId,
      })
      .from(topics)
      .innerJoin(phases, eq(phases.id, topics.phaseId))
      .where(inArray(phases.courseVersionId, versionIds)),
    executor
      .select({
        id: lessons.id,
        topicId: lessons.topicId,
        position: lessons.position,
        title: lessons.title,
        content: sql<string>`''`,
        contentFormat: lessons.contentFormat,
        videoUid: lessons.videoUid,
        durationSeconds: lessons.durationSeconds,
        versionId: phases.courseVersionId,
      })
      .from(lessons)
      .innerJoin(topics, eq(topics.id, lessons.topicId))
      .innerJoin(phases, eq(phases.id, topics.phaseId))
      .where(inArray(phases.courseVersionId, versionIds)),
    executor
      .select({ id: phaseAssessments.id, phaseId: phaseAssessments.phaseId, versionId: phases.courseVersionId })
      .from(phaseAssessments)
      .innerJoin(phases, eq(phases.id, phaseAssessments.phaseId))
      .where(inArray(phases.courseVersionId, versionIds)),
  ])
  for (const { versionId, ...row } of phaseRows) result.get(versionId)?.phases.push(row)
  for (const { versionId, ...row } of topicRows) result.get(versionId)?.topics.push(row)
  for (const { versionId, ...row } of lessonRows) result.get(versionId)?.lessons.push(row)
  for (const { versionId, ...row } of assessmentRows) result.get(versionId)?.assessments.push(row)
  return result
}

/** Progress rows of several attempts in three queries, grouped by enrollment id. */
export async function findAttemptActivities(enrollmentIds: string[], executor: Executor = getDb()): Promise<Map<string, AttemptActivity>> {
  const result = new Map<string, AttemptActivity>(
    enrollmentIds.map((id) => [id, { lessonCompletions: [], topicCompletions: [], phaseCompletions: [] }]),
  )
  if (!enrollmentIds.length) return result
  const [lessonRows, topicRows, phaseRows] = await Promise.all([
    executor
      .select({ enrollmentId: lessonCompletions.enrollmentId, lessonId: lessonCompletions.lessonId, completedAt: lessonCompletions.completedAt })
      .from(lessonCompletions)
      .where(inArray(lessonCompletions.enrollmentId, enrollmentIds)),
    executor
      .select({ enrollmentId: topicCompletions.enrollmentId, topicId: topicCompletions.topicId, completedAt: topicCompletions.completedAt })
      .from(topicCompletions)
      .where(inArray(topicCompletions.enrollmentId, enrollmentIds)),
    executor
      .select({ enrollmentId: phaseCompletions.enrollmentId, phaseId: phaseCompletions.phaseId, completedAt: phaseCompletions.completedAt })
      .from(phaseCompletions)
      .where(inArray(phaseCompletions.enrollmentId, enrollmentIds)),
  ])
  for (const { enrollmentId, ...row } of lessonRows) result.get(enrollmentId)?.lessonCompletions.push(row)
  for (const { enrollmentId, ...row } of topicRows) result.get(enrollmentId)?.topicCompletions.push(row)
  for (const { enrollmentId, ...row } of phaseRows) result.get(enrollmentId)?.phaseCompletions.push(row)
  return result
}
