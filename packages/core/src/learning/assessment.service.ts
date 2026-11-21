import 'server-only'
import { assessmentAnswers, assessmentAttempts, getDb, type AssessmentAttempt, type CourseKind } from '@workspace/db'
import { findApplicationByUserId } from '../applications/application.repository'
import { findPhase, type MapPhase } from './course-map'
import { findCourseAttempt, findCourseAttempts, findCourseRef } from './course-map.repository'
import {
  FOUNDATION_LOCK_REASON,
  accessBlock,
  loadMap,
  markPhasePassed,
  toAttemptInfo,
  type AttemptInfo,
} from './course-learning.service'
import {
  findAssessmentAnswers,
  findAssessmentAttempts,
  findAssessmentLocation,
  findAssessmentQuestionsWithKey,
  findNextAssessmentAttemptNumber,
} from './assessment.repository'
import { grade, scoreQuiz, toFeedback, toPublic, type AnswerFeedback, type PublicQuestion } from './quiz-answer'
import type { SubmitAssessmentInput } from './assessment.schema'

export type AssessmentHistoryEntry = Pick<
  AssessmentAttempt,
  'id' | 'attemptNumber' | 'submittedAt' | 'correctCount' | 'totalQuestions' | 'scorePercent' | 'passed'
> & { review: AnswerFeedback[] }

export type AssessmentView =
  | { kind: 'not_found' }
  | { kind: 'locked'; title: string; phaseTitle: string; reason: string; course: { kind: CourseKind; slug: string } }
  | {
      kind: 'assessment'
      assessment: { id: string; title: string; instructions: string }
      course: { id: string; kind: CourseKind; slug: string; title: string }
      phase: Pick<MapPhase, 'id' | 'title' | 'position'>
      attempt: AttemptInfo
      /** Only the live enrollment attempt can submit; older attempts show their history read-only. */
      editable: boolean
      attemptParam: number | undefined
      passed: boolean
      nextPhase: { title: string; position: number } | null
      /** No answer key: correct answers appear only in submitted history. */
      questions: PublicQuestion[]
      history: AssessmentHistoryEntry[]
    }

function eligibility(phase: MapPhase): string | null {
  if (phase.state === 'locked') return phase.lockedReason ?? 'This phase is locked.'
  if (!phase.topicsComplete) {
    return `Pass every topic quiz in “${phase.title}” to unlock its assessment (${phase.completedTopics} of ${phase.topics.length} passed).`
  }
  return null
}

/**
 * The assessment must belong to a phase in the version of one of the learner's own attempts, the course must
 * be open to them, the phase unlocked, and every topic quiz in it passed. Pass the session user id only.
 */
export async function getAssessmentView(userId: string, assessmentId: string, attemptNumber?: number): Promise<AssessmentView> {
  const db = getDb()
  const location = await findAssessmentLocation(assessmentId, db)
  if (!location) return { kind: 'not_found' }
  const course = await findCourseRef({ id: location.courseId }, db)
  if (!course) return { kind: 'not_found' }
  const block = await accessBlock(userId, course, db)
  if (block === 'not_found') return { kind: 'not_found' }

  const onVersion = (await findCourseAttempts(userId, course.id, db)).filter((a) => a.courseVersionId === location.courseVersionId)
  const live = onVersion.find((a) => a.status === 'in_progress')
  const attempt = attemptNumber !== undefined ? onVersion.find((a) => a.attemptNumber === attemptNumber) : (live ?? onVersion[0])
  if (!attempt) return { kind: 'not_found' }

  const courseInfo = { kind: course.kind, slug: course.slug }
  if (block === 'locked') {
    return { kind: 'locked', title: location.title, phaseTitle: '', reason: FOUNDATION_LOCK_REASON, course: courseInfo }
  }

  const map = await loadMap(attempt, db)
  const phase = findPhase(map, location.phaseId)
  if (!phase) return { kind: 'not_found' }
  const reason = eligibility(phase)
  if (reason) return { kind: 'locked', title: location.title, phaseTitle: phase.title, reason, course: courseInfo }

  const [questions, attempts] = await Promise.all([
    findAssessmentQuestionsWithKey(assessmentId, db),
    findAssessmentAttempts(attempt.id, assessmentId, db),
  ])
  const answers = await findAssessmentAnswers(attempts.map((a) => a.id), db)
  const byId = new Map(questions.map((q) => [q.id, q]))
  const next = map.phases.find((p) => p.position > phase.position) ?? null

  return {
    kind: 'assessment',
    assessment: { id: location.assessmentId, title: location.title, instructions: location.instructions },
    course: { id: course.id, kind: course.kind, slug: course.slug, title: attempt.versionTitle },
    phase: { id: phase.id, title: phase.title, position: phase.position },
    attempt: toAttemptInfo(attempt),
    editable: attempt.status === 'in_progress',
    attemptParam: live && live.id === attempt.id ? undefined : attempt.attemptNumber,
    passed: phase.assessmentPassed,
    nextPhase: next ? { title: next.title, position: next.position } : null,
    questions: questions.map(toPublic),
    history: attempts.map((a) => ({
      id: a.id,
      attemptNumber: a.attemptNumber,
      submittedAt: a.submittedAt,
      correctCount: a.correctCount,
      totalQuestions: a.totalQuestions,
      scorePercent: a.scorePercent,
      passed: a.passed,
      review: questions.flatMap((q) => {
        const row = answers.find((ans) => ans.assessmentAttemptId === a.id && ans.questionId === q.id)
        return row && byId.get(q.id) ? [toFeedback(q, row)] : []
      }),
    })),
  }
}

export type AssessmentResult = {
  attemptNumber: number
  correctCount: number
  totalQuestions: number
  scorePercent: number
  passed: boolean
  phaseCompleted: boolean
  nextPhase: { title: string; position: number } | null
  courseCompleted: boolean
}

export type SubmitAssessmentResult =
  | { ok: true; result: AssessmentResult; review: AnswerFeedback[] }
  | {
      ok: false
      reason: 'not_approved' | 'not_found' | 'locked' | 'no_active_attempt' | 'not_eligible' | 'incomplete' | 'invalid_answer' | 'no_questions'
      message?: string
    }

/**
 * Grades a full submission on the server. In one transaction, with the enrollment row locked: eligibility
 * is re-checked immediately before accepting, the try and every answer are stored, and on a 100% score the
 * phase is completed (unlocking the next one) with any badges. Scores sent by a client are never accepted.
 */
export async function submitAssessment(userId: string, input: SubmitAssessmentInput): Promise<SubmitAssessmentResult> {
  return getDb().transaction(async (tx): Promise<SubmitAssessmentResult> => {
    const application = await findApplicationByUserId(userId, tx)
    if (application?.status !== 'approved') return { ok: false, reason: 'not_approved' }

    const location = await findAssessmentLocation(input.assessmentId, tx)
    if (!location) return { ok: false, reason: 'not_found' }
    const course = await findCourseRef({ id: location.courseId }, tx)
    if (!course) return { ok: false, reason: 'not_found' }
    const block = await accessBlock(userId, course, tx)
    if (block) return { ok: false, reason: block }

    const attempt = await findCourseAttempt(userId, course.id, tx, { liveOnly: true, forUpdate: true })
    if (!attempt) return { ok: false, reason: 'no_active_attempt' }
    // The live attempt must be on the version this assessment belongs to.
    if (attempt.courseVersionId !== location.courseVersionId) return { ok: false, reason: 'not_found' }

    const map = await loadMap(attempt, tx)
    const phase = findPhase(map, location.phaseId)
    if (!phase) return { ok: false, reason: 'not_found' }
    const reason = eligibility(phase)
    if (reason) return { ok: false, reason: 'not_eligible', message: reason }

    const questions = await findAssessmentQuestionsWithKey(input.assessmentId, tx)
    if (!questions.length) return { ok: false, reason: 'no_questions' }
    const given = new Map(input.answers.map((a) => [a.questionId, a.answer]))
    if (given.size !== questions.length || questions.some((q) => !given.has(q.id))) return { ok: false, reason: 'incomplete' }

    const graded = questions.map((q) => ({ q, answer: given.get(q.id)!, isCorrect: grade(q, given.get(q.id)!) }))
    if (graded.some((g) => g.isCorrect === null)) return { ok: false, reason: 'invalid_answer' }

    const correctCount = graded.filter((g) => g.isCorrect).length
    const { scorePercent, passed } = scoreQuiz(correctCount, questions.length)
    const attemptNumber = await findNextAssessmentAttemptNumber(attempt.id, input.assessmentId, tx)

    const [row] = await tx
      .insert(assessmentAttempts)
      .values({
        enrollmentId: attempt.id,
        assessmentId: input.assessmentId,
        attemptNumber,
        totalQuestions: questions.length,
        correctCount,
        scorePercent,
        passed,
      })
      .returning({ id: assessmentAttempts.id })

    const answerRows = graded.map(({ q, answer, isCorrect }) => ({
      assessmentAttemptId: row!.id,
      questionId: q.id,
      selectedOptionId: answer.kind === 'mcq' ? answer.optionId : null,
      textAnswer: answer.kind === 'fill_blank' ? answer.text : null,
      isCorrect: isCorrect!,
    }))
    await tx.insert(assessmentAnswers).values(answerRows)

    let courseCompleted = false
    if (passed && !phase.assessmentPassed) {
      const progress = await markPhasePassed(tx, course, attempt, phase.id)
      courseCompleted = progress.ok && progress.courseCompleted
    }
    const next = map.phases.find((p) => p.position > phase.position) ?? null

    return {
      ok: true,
      result: {
        attemptNumber,
        correctCount,
        totalQuestions: questions.length,
        scorePercent,
        passed,
        phaseCompleted: passed,
        nextPhase: passed && next ? { title: next.title, position: next.position } : null,
        courseCompleted,
      },
      review: graded.map(({ q }, i) => toFeedback(q, answerRows[i]!)),
    }
  })
}
