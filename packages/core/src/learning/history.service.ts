import 'server-only'
import { and, asc, count, desc, eq, inArray, max, type SQL } from 'drizzle-orm'
import {
  assessmentAttempts,
  badges,
  courses,
  courseVersions,
  enrollments,
  getDb,
  phaseAssessments,
  phaseCompletions,
  phases,
  quizAttempts,
  streams,
  topicCompletions,
  topicQuizzes,
  topics,
  userBadges,
  type CourseKind,
  type EnrollmentStatus,
} from '@workspace/db'
import { buildCourseMap, type NodeState } from './course-map'
import { findAttemptActivities, findVersionContents } from './course-map.repository'
import type { HistoryFilter } from './history.schema'

export const HISTORY_PAGE_SIZE = 10

export type HistoryCourse = { id: string; kind: CourseKind; slug: string; title: string; streamTitle: string | null }

export type HistoryRow = {
  enrollmentId: string
  course: HistoryCourse
  attemptNumber: number
  /** The version this attempt was assigned, never the course's current one. */
  version: number
  status: EnrollmentStatus
  startedAt: Date
  endedAt: Date | null
  completedAt: Date | null
  percent: number
  completedTopics: number
  totalTopics: number
  completedPhases: number
  totalPhases: number
  /** Highest stored phase-assessment score in this attempt; null when none was taken. */
  bestAssessmentScore: number | null
}

export type HistoryPage = { rows: HistoryRow[]; page: number; pageCount: number; total: number; filter: HistoryFilter }

const attemptColumns = {
  enrollmentId: enrollments.id,
  courseId: courses.id,
  courseKind: courses.kind,
  courseSlug: courses.slug,
  versionId: courseVersions.id,
  versionTitle: courseVersions.title,
  version: courseVersions.version,
  streamTitle: streams.title,
  attemptNumber: enrollments.attemptNumber,
  status: enrollments.status,
  startedAt: enrollments.startedAt,
  endedAt: enrollments.endedAt,
}

function filterCondition(filter: HistoryFilter): SQL | undefined {
  switch (filter) {
    case 'foundation':
      return eq(courses.kind, 'foundation')
    case 'tracks':
      return eq(courses.kind, 'track')
    case 'in_progress':
      return eq(enrollments.status, 'in_progress')
    case 'completed':
      return eq(enrollments.status, 'completed')
    default:
      return undefined
  }
}

/**
 * One page of the learner's enrollment attempts, newest first. Every query is scoped by the session user
 * id; progress is computed from each attempt's own completion rows against its own course version.
 */
export async function listHistory(userId: string, filter: HistoryFilter, page: number): Promise<HistoryPage> {
  const db = getDb()
  const where = and(eq(enrollments.userId, userId), filterCondition(filter))

  const [{ total } = { total: 0 }] = await db
    .select({ total: count() })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(where)
  const pageCount = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE))
  const current = Math.min(Math.max(1, page), pageCount)

  const attempts = await db
    .select(attemptColumns)
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .innerJoin(courseVersions, eq(courseVersions.id, enrollments.courseVersionId))
    .leftJoin(streams, eq(streams.id, courses.streamId))
    .where(where)
    .orderBy(desc(enrollments.startedAt))
    .limit(HISTORY_PAGE_SIZE)
    .offset((current - 1) * HISTORY_PAGE_SIZE)

  const ids = attempts.map((a) => a.enrollmentId)
  const [contents, activities, bestScores] = await Promise.all([
    findVersionContents([...new Set(attempts.map((a) => a.versionId))], db),
    findAttemptActivities(ids, db),
    ids.length
      ? db
          .select({ enrollmentId: assessmentAttempts.enrollmentId, best: max(assessmentAttempts.scorePercent) })
          .from(assessmentAttempts)
          .where(inArray(assessmentAttempts.enrollmentId, ids))
          .groupBy(assessmentAttempts.enrollmentId)
      : Promise.resolve([]),
  ])
  const best = new Map(bestScores.map((b) => [b.enrollmentId, b.best]))

  return {
    filter,
    page: current,
    pageCount,
    total,
    rows: attempts.map((a) => {
      const map = buildCourseMap(contents.get(a.versionId)!, activities.get(a.enrollmentId)!)
      return {
        enrollmentId: a.enrollmentId,
        course: { id: a.courseId, kind: a.courseKind, slug: a.courseSlug, title: a.versionTitle, streamTitle: a.streamTitle },
        attemptNumber: a.attemptNumber,
        version: a.version,
        status: a.status,
        startedAt: a.startedAt,
        endedAt: a.endedAt,
        completedAt: a.status === 'completed' ? a.endedAt : null,
        percent: map.percent,
        completedTopics: map.completedTopics,
        totalTopics: map.totalTopics,
        completedPhases: map.phases.filter((p) => p.state === 'completed').length,
        totalPhases: map.phases.length,
        bestAssessmentScore: best.get(a.enrollmentId) ?? null,
      }
    }),
  }
}

export type AttemptDetail = {
  summary: HistoryRow
  phases: {
    id: string
    position: number
    title: string
    state: NodeState
    completedAt: Date | null
    topics: { id: string; title: string; state: NodeState; completedAt: Date | null }[]
  }[]
  quizAttempts: {
    id: string
    topicTitle: string
    phasePosition: number
    attemptNumber: number
    scorePercent: number | null
    correctCount: number | null
    totalQuestions: number
    passed: boolean
    startedAt: Date
    finishedAt: Date | null
  }[]
  assessmentAttempts: {
    id: string
    phaseTitle: string
    phasePosition: number
    attemptNumber: number
    scorePercent: number
    correctCount: number
    totalQuestions: number
    passed: boolean
    submittedAt: Date
  }[]
  badges: { awardId: string; title: string; description: string; icon: string; earnedAt: Date }[]
}

/**
 * Full detail of one attempt. The attempt must belong to the session user (otherwise null, which callers
 * treat as not found). All records are read by this attempt's id and its own course version.
 */
export async function getAttemptDetail(userId: string, enrollmentId: string): Promise<AttemptDetail | null> {
  const db = getDb()
  const [attempt] = await db
    .select(attemptColumns)
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .innerJoin(courseVersions, eq(courseVersions.id, enrollments.courseVersionId))
    .leftJoin(streams, eq(streams.id, courses.streamId))
    .where(and(eq(enrollments.id, enrollmentId), eq(enrollments.userId, userId)))
    .limit(1)
  if (!attempt) return null

  const [contents, activities, topicDone, phaseDone, quizzes, assessments, awards] = await Promise.all([
    findVersionContents([attempt.versionId], db),
    findAttemptActivities([attempt.enrollmentId], db),
    db
      .select({ topicId: topicCompletions.topicId, completedAt: topicCompletions.completedAt })
      .from(topicCompletions)
      .where(eq(topicCompletions.enrollmentId, attempt.enrollmentId)),
    db
      .select({ phaseId: phaseCompletions.phaseId, completedAt: phaseCompletions.completedAt })
      .from(phaseCompletions)
      .where(eq(phaseCompletions.enrollmentId, attempt.enrollmentId)),
    db
      .select({
        id: quizAttempts.id,
        topicTitle: topics.title,
        phasePosition: phases.position,
        topicPosition: topics.position,
        attemptNumber: quizAttempts.attemptNumber,
        scorePercent: quizAttempts.scorePercent,
        correctCount: quizAttempts.correctCount,
        totalQuestions: quizAttempts.totalQuestions,
        passed: quizAttempts.passed,
        startedAt: quizAttempts.startedAt,
        finishedAt: quizAttempts.finishedAt,
      })
      .from(quizAttempts)
      .innerJoin(topicQuizzes, eq(topicQuizzes.id, quizAttempts.quizId))
      .innerJoin(topics, eq(topics.id, topicQuizzes.topicId))
      .innerJoin(phases, eq(phases.id, topics.phaseId))
      .where(eq(quizAttempts.enrollmentId, attempt.enrollmentId))
      .orderBy(asc(phases.position), asc(topics.position), asc(quizAttempts.attemptNumber)),
    db
      .select({
        id: assessmentAttempts.id,
        phaseTitle: phases.title,
        phasePosition: phases.position,
        attemptNumber: assessmentAttempts.attemptNumber,
        scorePercent: assessmentAttempts.scorePercent,
        correctCount: assessmentAttempts.correctCount,
        totalQuestions: assessmentAttempts.totalQuestions,
        passed: assessmentAttempts.passed,
        submittedAt: assessmentAttempts.submittedAt,
      })
      .from(assessmentAttempts)
      .innerJoin(phaseAssessments, eq(phaseAssessments.id, assessmentAttempts.assessmentId))
      .innerJoin(phases, eq(phases.id, phaseAssessments.phaseId))
      .where(eq(assessmentAttempts.enrollmentId, attempt.enrollmentId))
      .orderBy(asc(phases.position), asc(assessmentAttempts.attemptNumber)),
    db
      .select({ awardId: userBadges.id, title: badges.title, description: badges.description, icon: badges.icon, earnedAt: userBadges.earnedAt })
      .from(userBadges)
      .innerJoin(badges, eq(badges.id, userBadges.badgeId))
      .where(and(eq(userBadges.enrollmentId, attempt.enrollmentId), eq(userBadges.userId, userId)))
      .orderBy(asc(userBadges.earnedAt)),
  ])

  const map = buildCourseMap(contents.get(attempt.versionId)!, activities.get(attempt.enrollmentId)!)
  const topicAt = new Map(topicDone.map((t) => [t.topicId, t.completedAt]))
  const phaseAt = new Map(phaseDone.map((p) => [p.phaseId, p.completedAt]))
  const best = assessments.reduce<number | null>((m, a) => (m === null || a.scorePercent > m ? a.scorePercent : m), null)

  return {
    summary: {
      enrollmentId: attempt.enrollmentId,
      course: { id: attempt.courseId, kind: attempt.courseKind, slug: attempt.courseSlug, title: attempt.versionTitle, streamTitle: attempt.streamTitle },
      attemptNumber: attempt.attemptNumber,
      version: attempt.version,
      status: attempt.status,
      startedAt: attempt.startedAt,
      endedAt: attempt.endedAt,
      completedAt: attempt.status === 'completed' ? attempt.endedAt : null,
      percent: map.percent,
      completedTopics: map.completedTopics,
      totalTopics: map.totalTopics,
      completedPhases: map.phases.filter((p) => p.state === 'completed').length,
      totalPhases: map.phases.length,
      bestAssessmentScore: best,
    },
    phases: map.phases.map((p) => ({
      id: p.id,
      position: p.position,
      title: p.title,
      state: p.state,
      // Phases without an assessment complete through their topics and have no completion row.
      completedAt: phaseAt.get(p.id) ?? (p.state === 'completed' && !p.assessmentId
        ? p.topics.reduce<Date | null>((m, t) => {
            const at = topicAt.get(t.id) ?? null
            return at && (!m || at > m) ? at : m
          }, null)
        : null),
      topics: p.topics.map((t) => ({ id: t.id, title: t.title, state: t.state, completedAt: topicAt.get(t.id) ?? null })),
    })),
    quizAttempts: quizzes.map(({ topicPosition: _topicPosition, ...q }) => q),
    assessmentAttempts: assessments,
    badges: awards,
  }
}
