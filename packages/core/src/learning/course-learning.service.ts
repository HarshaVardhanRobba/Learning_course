import 'server-only'
import { and, eq, inArray } from 'drizzle-orm'
import {
  badges,
  enrollments,
  getDb,
  lessonCompletions,
  topicCompletions,
  userBadges,
  type CourseKind,
  type Executor,
  type Tx,
} from '@workspace/db'
import { findApplicationByUserId } from '../applications/application.repository'
import { buildCourseMap, findTopic, type CourseMap, type MapPhase, type MapTopic } from './course-map'
import {
  findAttemptActivity,
  findCourseAttempt,
  findCourseAttempts,
  findCourseRef,
  findVersionContent,
  type AttemptWithCourse,
  type CourseRef,
} from './course-map.repository'
import { findPublishedCourses, type PublishedCourse } from './learning.repository'
import { hasCompletedFoundation } from './learning.service'

/**
 * Learning maps and progress for any course (the Common Foundation or a track). Every read and write
 * resolves the attempt from the session user, evaluates unlock rules on the server, and only ever
 * touches content of the version that attempt is assigned to.
 */

export type AttemptInfo = Pick<AttemptWithCourse, 'id' | 'attemptNumber' | 'status' | 'version' | 'versionTitle' | 'startedAt' | 'endedAt'>

export type CourseHeader = {
  courseId: string
  slug: string
  kind: CourseKind
  title: string
  summary: string
  stream: PublishedCourse['stream']
  /** Latest published version; null when the course has none (then no new attempts can start). */
  latestVersion: number | null
}

export type CourseMapView =
  | { kind: 'not_found' }
  | { kind: 'locked'; course: CourseHeader; reason: string }
  | { kind: 'not_started'; course: CourseHeader }
  | {
      kind: 'map'
      course: CourseHeader
      attempt: AttemptInfo
      /** Every attempt, newest first, for switching between them. */
      attempts: AttemptInfo[]
      /** True only for the live attempt; earlier attempts are shown read-only. */
      editable: boolean
      canStartNew: boolean
      canRestart: boolean
      map: CourseMap
    }

const FOUNDATION_LOCK_REASON = 'Complete the Common Foundation to unlock every track.'

function toAttemptInfo(a: AttemptWithCourse): AttemptInfo {
  const { id, attemptNumber, status, version, versionTitle, startedAt, endedAt } = a
  return { id, attemptNumber, status, version, versionTitle, startedAt, endedAt }
}

async function loadMap(attempt: AttemptWithCourse, executor: Executor): Promise<CourseMap> {
  const [content, activity] = await Promise.all([
    findVersionContent(attempt.courseVersionId, executor),
    findAttemptActivity(attempt.id, executor),
  ])
  return buildCourseMap(content, activity)
}

/** Tracks need a stream and a completed foundation; the foundation is always open to approved learners. */
async function accessBlock(userId: string, course: CourseRef, executor: Executor): Promise<'not_found' | 'locked' | null> {
  if (course.kind === 'foundation') return null
  if (!course.streamId) return 'not_found'
  return (await hasCompletedFoundation(userId, executor)) ? null : 'locked'
}

async function courseHeader(course: CourseRef, executor: Executor, fallback?: AttemptWithCourse): Promise<CourseHeader | null> {
  const published = (await findPublishedCourses(executor)).find((c) => c.courseId === course.id)
  // Only published versions are offered; a course with none is shown only through the learner's own attempt.
  if (!published && !fallback) return null
  return {
    courseId: course.id,
    slug: course.slug,
    kind: course.kind,
    title: published?.title ?? fallback!.versionTitle,
    summary: published?.summary ?? fallback!.versionSummary,
    stream: published?.stream ?? null,
    latestVersion: published?.version ?? null,
  }
}

async function getCourseMap(userId: string, course: CourseRef | null, attemptNumber?: number): Promise<CourseMapView> {
  const db = getDb()
  if (!course) return { kind: 'not_found' }

  const block = await accessBlock(userId, course, db)
  if (block === 'not_found') return { kind: 'not_found' }

  const attempts = await findCourseAttempts(userId, course.id, db)
  const live = attempts.find((a) => a.status === 'in_progress')
  const selected =
    attemptNumber !== undefined ? attempts.find((a) => a.attemptNumber === attemptNumber) : (live ?? attempts[0])

  const header = await courseHeader(course, db, selected)
  if (!header) return { kind: 'not_found' }
  if (block === 'locked') return { kind: 'locked', course: header, reason: FOUNDATION_LOCK_REASON }
  if (attemptNumber !== undefined && !selected) return { kind: 'not_found' }
  if (!selected) return header.latestVersion === null ? { kind: 'not_found' } : { kind: 'not_started', course: header }

  const canStart = header.latestVersion !== null
  return {
    kind: 'map',
    course: header,
    attempt: toAttemptInfo(selected),
    attempts: attempts.map(toAttemptInfo),
    editable: selected.status === 'in_progress',
    canStartNew: canStart && !live,
    canRestart: canStart && !!live,
    map: await loadMap(selected, db),
  }
}

export async function getFoundationMap(userId: string): Promise<CourseMapView> {
  return getCourseMap(userId, await findCourseRef({ kind: 'foundation' }))
}

/** Pass the session-resolved user id only. `attemptNumber` selects one of that user's own attempts. */
export async function getTrackMap(userId: string, slug: string, attemptNumber?: number): Promise<CourseMapView> {
  return getCourseMap(userId, await findCourseRef({ slug, kind: 'track' }), attemptNumber)
}

export type TopicView =
  | { kind: 'not_found' }
  | { kind: 'locked'; course: Pick<CourseRef, 'id' | 'slug' | 'kind'>; topicTitle: string; reason: string }
  | {
      kind: 'topic'
      course: Pick<CourseRef, 'id' | 'slug' | 'kind'>
      courseTitle: string
      attempt: AttemptInfo
      editable: boolean
      phase: Pick<MapPhase, 'id' | 'title' | 'position'>
      topic: MapTopic
      /** Topic quiz stand-in: the topic can be completed once every lesson is covered. */
      canComplete: boolean
    }

/**
 * A topic of one of the learner's own attempts. A topic from another course or version is `not_found`;
 * a topic in a locked phase (or a track before the foundation) returns the reason, never the lessons.
 */
async function getCourseTopic(userId: string, course: CourseRef | null, topicId: string, attemptNumber?: number): Promise<TopicView> {
  const db = getDb()
  if (!course) return { kind: 'not_found' }
  const ref = { id: course.id, slug: course.slug, kind: course.kind }

  const block = await accessBlock(userId, course, db)
  if (block === 'not_found') return { kind: 'not_found' }

  const attempt = await findCourseAttempt(userId, course.id, db, { attemptNumber })
  if (!attempt) return { kind: 'not_found' }
  if (block === 'locked') return { kind: 'locked', course: ref, topicTitle: 'This topic', reason: FOUNDATION_LOCK_REASON }

  const map = await loadMap(attempt, db)
  const found = findTopic(map, topicId)
  if (!found) return { kind: 'not_found' }
  const { phase, topic } = found

  if (topic.state === 'locked') {
    return { kind: 'locked', course: ref, topicTitle: topic.title, reason: topic.lockedReason ?? 'This topic is locked.' }
  }

  const editable = attempt.status === 'in_progress'
  return {
    kind: 'topic',
    course: ref,
    courseTitle: attempt.versionTitle,
    attempt: toAttemptInfo(attempt),
    editable,
    phase: { id: phase.id, title: phase.title, position: phase.position },
    topic,
    canComplete: editable && topic.state !== 'completed' && topic.lessonsDone === topic.lessons.length,
  }
}

export async function getFoundationTopic(userId: string, topicId: string): Promise<TopicView> {
  return getCourseTopic(userId, await findCourseRef({ kind: 'foundation' }), topicId)
}

export async function getTrackTopic(userId: string, slug: string, topicId: string, attemptNumber?: number): Promise<TopicView> {
  return getCourseTopic(userId, await findCourseRef({ slug, kind: 'track' }), topicId, attemptNumber)
}

export type ProgressResult =
  | { ok: true; course: Pick<CourseRef, 'slug' | 'kind'>; courseCompleted: boolean }
  | { ok: false; reason: 'not_approved' | 'not_found' | 'locked' | 'no_active_attempt' | 'lessons_incomplete' }

/**
 * Writes only ever go to the learner's live attempt on the course. The attempt row is locked and the map
 * is re-derived inside the transaction, so unlock rules come from the database, never from the request.
 */
async function withLiveAttempt(
  userId: string,
  courseId: string,
  topicId: string,
  run: (ctx: { tx: Tx; course: CourseRef; attempt: AttemptWithCourse; topic: MapTopic }) => Promise<ProgressResult>,
): Promise<ProgressResult> {
  return getDb().transaction(async (tx) => {
    const application = await findApplicationByUserId(userId, tx)
    if (application?.status !== 'approved') return { ok: false, reason: 'not_approved' } as const

    const course = await findCourseRef({ id: courseId }, tx)
    if (!course) return { ok: false, reason: 'not_found' } as const
    const block = await accessBlock(userId, course, tx)
    if (block) return { ok: false, reason: block } as const

    const attempt = await findCourseAttempt(userId, course.id, tx, { liveOnly: true, forUpdate: true })
    if (!attempt) return { ok: false, reason: 'no_active_attempt' } as const

    const found = findTopic(await loadMap(attempt, tx), topicId)
    if (!found) return { ok: false, reason: 'not_found' } as const
    if (found.topic.state === 'locked') return { ok: false, reason: 'locked' } as const

    return run({ tx, course, attempt, topic: found.topic })
  })
}

export async function completeLesson(params: {
  userId: string
  courseId: string
  topicId: string
  lessonId: string
}): Promise<ProgressResult> {
  return withLiveAttempt(params.userId, params.courseId, params.topicId, async ({ tx, course, attempt, topic }) => {
    if (!topic.lessons.some((l) => l.id === params.lessonId)) return { ok: false, reason: 'not_found' }
    await tx.insert(lessonCompletions).values({ enrollmentId: attempt.id, lessonId: params.lessonId }).onConflictDoNothing()
    return { ok: true, course, courseCompleted: false }
  })
}

/**
 * Records the topic as passed. Until topic quizzes exist, the gate is "every lesson covered"; replace
 * that check with a passed quiz when quizzes are added. Finishing the last topic completes the attempt.
 */
export async function completeTopic(params: { userId: string; courseId: string; topicId: string }): Promise<ProgressResult> {
  return withLiveAttempt(params.userId, params.courseId, params.topicId, async ({ tx, course, attempt, topic }) => {
    if (topic.state === 'completed') return { ok: true, course, courseCompleted: false }
    if (topic.lessonsDone < topic.lessons.length) return { ok: false, reason: 'lessons_incomplete' }

    await tx.insert(topicCompletions).values({ enrollmentId: attempt.id, topicId: topic.id }).onConflictDoNothing()

    const after = await loadMap(attempt, tx)
    const earned = ['first-topic']
    if (after.phases.some((p) => p.state === 'completed')) earned.push('first-phase')
    if (after.isComplete) {
      await tx
        .update(enrollments)
        .set({ status: 'completed', endedAt: new Date() })
        .where(and(eq(enrollments.id, attempt.id), eq(enrollments.status, 'in_progress')))
      earned.push(course.kind === 'foundation' ? 'foundation-complete' : 'track-complete')
    }
    await awardBadges(tx, attempt.userId, attempt.id, earned)
    return { ok: true, course, courseCompleted: after.isComplete }
  })
}

/** Badges are earned once per learner; re-earning is a no-op. */
async function awardBadges(tx: Tx, userId: string, enrollmentId: string, slugs: string[]) {
  const rows = await tx.select({ id: badges.id }).from(badges).where(inArray(badges.slug, slugs))
  if (!rows.length) return
  await tx
    .insert(userBadges)
    .values(rows.map((b) => ({ userId, badgeId: b.id, enrollmentId })))
    .onConflictDoNothing()
}
