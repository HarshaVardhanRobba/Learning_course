import 'server-only'
import { and, asc, desc, eq, inArray, max } from 'drizzle-orm'
import {
  assessmentAnswers,
  assessmentAttempts,
  assessmentOptions,
  assessmentQuestions,
  courseVersions,
  getDb,
  phaseAssessments,
  phases,
  type Executor,
} from '@workspace/db'
import type { QuestionWithKey } from './quiz.repository'

/** Where an assessment lives: its phase, that phase's course version, and the course. */
export async function findAssessmentLocation(assessmentId: string, executor: Executor = getDb()) {
  const [row] = await executor
    .select({
      assessmentId: phaseAssessments.id,
      title: phaseAssessments.title,
      instructions: phaseAssessments.instructions,
      phaseId: phaseAssessments.phaseId,
      courseVersionId: phases.courseVersionId,
      courseId: courseVersions.courseId,
    })
    .from(phaseAssessments)
    .innerJoin(phases, eq(phases.id, phaseAssessments.phaseId))
    .innerJoin(courseVersions, eq(courseVersions.id, phases.courseVersionId))
    .where(eq(phaseAssessments.id, assessmentId))
    .limit(1)
  return row ?? null
}

/** Questions with their answer key, in the same shape as topic quiz questions. Server-only. */
export async function findAssessmentQuestionsWithKey(assessmentId: string, executor: Executor = getDb()): Promise<QuestionWithKey[]> {
  const questionRows = await executor
    .select()
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, assessmentId))
    .orderBy(asc(assessmentQuestions.position))
  if (!questionRows.length) return []
  const optionRows = await executor
    .select()
    .from(assessmentOptions)
    .where(inArray(assessmentOptions.questionId, questionRows.map((q) => q.id)))
    .orderBy(asc(assessmentOptions.position))
  return questionRows.map((q) => ({
    id: q.id,
    position: q.position,
    kind: q.kind,
    prompt: q.prompt,
    explanation: q.explanation,
    acceptedAnswers: q.acceptedAnswers,
    options: optionRows.filter((o) => o.questionId === q.id).map((o) => ({ id: o.id, label: o.label, isCorrect: o.isCorrect })),
  }))
}

export async function findAssessmentAttempts(enrollmentId: string, assessmentId: string, executor: Executor = getDb()) {
  return executor
    .select()
    .from(assessmentAttempts)
    .where(and(eq(assessmentAttempts.enrollmentId, enrollmentId), eq(assessmentAttempts.assessmentId, assessmentId)))
    .orderBy(desc(assessmentAttempts.attemptNumber))
}

export async function findAssessmentAnswers(attemptIds: string[], executor: Executor = getDb()) {
  if (!attemptIds.length) return []
  return executor.select().from(assessmentAnswers).where(inArray(assessmentAnswers.assessmentAttemptId, attemptIds))
}

export async function findNextAssessmentAttemptNumber(enrollmentId: string, assessmentId: string, executor: Executor): Promise<number> {
  const [row] = await executor
    .select({ n: max(assessmentAttempts.attemptNumber) })
    .from(assessmentAttempts)
    .where(and(eq(assessmentAttempts.enrollmentId, enrollmentId), eq(assessmentAttempts.assessmentId, assessmentId)))
  return (row?.n ?? 0) + 1
}
