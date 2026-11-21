import 'server-only'
import { and, eq } from 'drizzle-orm'
import { getDb, lessonCompletions, type CourseKind } from '@workspace/db'
import { getSignedR2Url, getVideoPlayback, type VideoPlayback } from '../media/media.service'
import { findTopic, flattenLessons, type CourseMap, type MapLesson, type MapPhase, type MapTopic } from './course-map'
import {
  findCourseAttempts,
  findCourseRef,
  findLessonLocation,
  findLessonResources,
  findResourceById,
  type AttemptWithCourse,
} from './course-map.repository'
import {
  FOUNDATION_LOCK_REASON,
  accessBlock,
  completeLesson,
  loadMap,
  toAttemptInfo,
  withLiveAttempt,
  type AttemptInfo,
  type ProgressResult,
} from './course-learning.service'
import { findQuizIdsByTopics } from './quiz.repository'

export type LessonNavTarget = { id: string; title: string; locked: boolean } | null

export type LessonResourceView = { id: string; title: string; kind: 'link' | 'file' }

export type LessonView =
  | { kind: 'not_found' }
  | { kind: 'locked'; course: { kind: CourseKind; slug: string; title: string }; lessonTitle: string; reason: string }
  | {
      kind: 'lesson'
      course: { id: string; kind: CourseKind; slug: string; title: string }
      attempt: AttemptInfo
      /** Selected attempt is the live one; older attempts are read-only. */
      editable: boolean
      /** Set when the learner is viewing an older attempt, so links keep pointing at it. */
      attemptParam: number | undefined
      phase: Pick<MapPhase, 'id' | 'title' | 'position'>
      topic: Pick<MapTopic, 'id' | 'title' | 'description' | 'state' | 'lessonsDone'> & { lessonCount: number }
      lesson: MapLesson
      map: CourseMap
      previous: LessonNavTarget
      next: LessonNavTarget
      video: VideoPlayback | null
      resources: LessonResourceView[]
      /** Topic quiz access: available once every lesson is covered. `quizId` is null for topics without a quiz. */
      quiz: { state: 'locked' | 'available' | 'passed'; quizId: string | null }
      /** Quiz id per topic of this version, for the sidebar's quiz rows. */
      quizIds: Record<string, string>
    }

type Resolved =
  | { kind: 'not_found' }
  | { kind: 'locked'; reason: string; title: string; course: { kind: CourseKind; slug: string; title: string } }
  | {
      kind: 'ok'
      attempt: AttemptWithCourse
      attempts: AttemptWithCourse[]
      map: CourseMap
      found: { phase: MapPhase; topic: MapTopic }
      lesson: MapLesson
      courseRef: { id: string; kind: CourseKind; slug: string }
    }

/**
 * The single access check for lesson material. The lesson must belong to the course version of one of
 * the learner's own attempts (so draft or never-published content is unreachable), the course must be
 * open to them, and the lesson's topic must be unlocked in that attempt.
 */
async function resolveLesson(userId: string, lessonId: string, attemptNumber?: number): Promise<Resolved> {
  const db = getDb()
  const location = await findLessonLocation(lessonId, db)
  if (!location) return { kind: 'not_found' }

  const course = await findCourseRef({ id: location.courseId }, db)
  if (!course) return { kind: 'not_found' }
  const block = await accessBlock(userId, course, db)
  if (block === 'not_found') return { kind: 'not_found' }

  const attempts = await findCourseAttempts(userId, course.id, db)
  const onVersion = attempts.filter((a) => a.courseVersionId === location.courseVersionId)
  const attempt =
    attemptNumber !== undefined
      ? onVersion.find((a) => a.attemptNumber === attemptNumber)
      : (onVersion.find((a) => a.status === 'in_progress') ?? onVersion[0])
  if (!attempt) return { kind: 'not_found' }

  const courseInfo = { kind: course.kind, slug: course.slug, title: attempt.versionTitle }
  if (block === 'locked') return { kind: 'locked', reason: FOUNDATION_LOCK_REASON, title: 'This lesson', course: courseInfo }

  const map = await loadMap(attempt, db)
  const found = findTopic(map, location.topicId)
  const lesson = found?.topic.lessons.find((l) => l.id === lessonId)
  if (!found || !lesson) return { kind: 'not_found' }
  if (found.topic.state === 'locked') {
    return { kind: 'locked', reason: found.topic.lockedReason ?? 'This lesson is locked.', title: lesson.title, course: courseInfo }
  }
  return { kind: 'ok', attempt, attempts, map, found, lesson, courseRef: { id: course.id, kind: course.kind, slug: course.slug } }
}

/** Pass the session-resolved user id only. Opening a lesson never marks it complete. */
export async function getLessonView(userId: string, lessonId: string, attemptNumber?: number): Promise<LessonView> {
  const r = await resolveLesson(userId, lessonId, attemptNumber)
  if (r.kind === 'not_found') return r
  if (r.kind === 'locked') return { kind: 'locked', course: r.course, lessonTitle: r.title, reason: r.reason }

  const { attempt, map, found, lesson } = r
  const ordered = flattenLessons(map)
  const index = ordered.findIndex((entry) => entry.lesson.id === lesson.id)
  const nav = (i: number): LessonNavTarget => {
    const entry = ordered[i]
    return entry ? { id: entry.lesson.id, title: entry.lesson.title, locked: entry.topic.state === 'locked' } : null
  }

  const editable = attempt.status === 'in_progress'
  const live = r.attempts.find((a) => a.status === 'in_progress')
  const topic = found.topic
  const allCovered = topic.lessons.length > 0 && topic.lessonsDone === topic.lessons.length

  const [video, resources, quizIds] = await Promise.all([
    lesson.videoUid ? getVideoPlayback(lesson.videoUid) : Promise.resolve(null),
    findLessonResources(lesson.id),
    findQuizIdsByTopics(map.phases.flatMap((p) => p.topics.map((t) => t.id))),
  ])
  const quizId = quizIds.get(topic.id) ?? null

  return {
    kind: 'lesson',
    course: { id: r.courseRef.id, kind: r.courseRef.kind, slug: r.courseRef.slug, title: attempt.versionTitle },
    attempt: toAttemptInfo(attempt),
    editable,
    attemptParam: live && live.id === attempt.id ? undefined : attempt.attemptNumber,
    phase: { id: found.phase.id, title: found.phase.title, position: found.phase.position },
    topic: {
      id: topic.id,
      title: topic.title,
      description: topic.description,
      state: topic.state,
      lessonsDone: topic.lessonsDone,
      lessonCount: topic.lessons.length,
    },
    lesson,
    map,
    previous: nav(index - 1),
    next: nav(index + 1),
    video,
    resources: resources.map(({ id, title, kind }) => ({ id, title, kind })),
    quiz: { state: topic.state === 'completed' ? 'passed' : allCovered ? 'available' : 'locked', quizId },
    quizIds: Object.fromEntries(quizIds),
  }
}

/**
 * Sidebar checkbox: marks a lesson completed or not on the learner's live attempt. Unchecking is refused
 * once the topic is completed, so a passed topic never ends up with uncovered lessons.
 */
export async function setLessonCompletion(userId: string, lessonId: string, done: boolean): Promise<ProgressResult> {
  if (done) return completeLessonById(userId, lessonId)
  const location = await findLessonLocation(lessonId)
  if (!location) return { ok: false, reason: 'not_found' }
  return withLiveAttempt<ProgressResult>(userId, location.courseId, location.topicId, async ({ tx, course, attempt, topic }) => {
    if (!topic.lessons.some((l) => l.id === lessonId)) return { ok: false, reason: 'not_found' }
    if (topic.state === 'completed') return { ok: false, reason: 'topic_completed' }
    await tx
      .delete(lessonCompletions)
      .where(and(eq(lessonCompletions.enrollmentId, attempt.id), eq(lessonCompletions.lessonId, lessonId)))
    return { ok: true, course, courseCompleted: false }
  })
}

/** Marks one lesson covered on the learner's live attempt. Locked or foreign lessons are refused. */
export async function completeLessonById(userId: string, lessonId: string): Promise<ProgressResult> {
  const location = await findLessonLocation(lessonId)
  if (!location) return { ok: false, reason: 'not_found' }
  // completeLesson re-checks approval, course access, the live attempt, version ownership and locks.
  return completeLesson({ userId, courseId: location.courseId, topicId: location.topicId, lessonId })
}

/**
 * Resolves a lesson resource to a URL, only after the same access check as the lesson itself. Files in
 * private R2 get a presigned URL valid for about a minute; links are returned as stored.
 */
export async function getResourceUrl(userId: string, resourceId: string): Promise<string | null> {
  const resource = await findResourceById(resourceId)
  if (!resource) return null
  const access = await resolveLesson(userId, resource.lessonId)
  if (access.kind !== 'ok') return null

  if (resource.kind === 'link') return resource.url
  return resource.r2Key ? getSignedR2Url(resource.r2Key, access.lesson.title) : null
}
