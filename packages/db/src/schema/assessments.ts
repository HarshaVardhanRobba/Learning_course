import { sql } from 'drizzle-orm'
import { boolean, check, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { phases } from './courses'
import { enrollments } from './enrollments'
import { quizQuestionKind } from './quizzes'

/** One assessment per phase, in the phase's course version. Taken after every topic quiz in the phase is passed. */
export const phaseAssessments = pgTable('phase_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  phaseId: uuid('phase_id')
    .notNull()
    .unique()
    .references(() => phases.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  instructions: text('instructions').notNull().default(''),
})

/** Same two question kinds as topic quizzes (MCQ and fill-in-the-blank), never others. */
export const assessmentQuestions = pgTable(
  'assessment_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => phaseAssessments.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    kind: quizQuestionKind('kind').notNull(),
    prompt: text('prompt').notNull(),
    acceptedAnswers: text('accepted_answers').array().notNull().default(sql`'{}'::text[]`),
    explanation: text('explanation').notNull().default(''),
  },
  (table) => [
    uniqueIndex('assessment_questions_position_unique').on(table.assessmentId, table.position),
    check(
      'assessment_questions_answers_by_kind',
      sql`(${table.kind} = 'fill_blank' and cardinality(${table.acceptedAnswers}) > 0) or (${table.kind} = 'mcq' and cardinality(${table.acceptedAnswers}) = 0)`,
    ),
  ],
)

export const assessmentOptions = pgTable(
  'assessment_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => assessmentQuestions.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    label: text('label').notNull(),
    isCorrect: boolean('is_correct').notNull().default(false),
  },
  (table) => [
    uniqueIndex('assessment_options_position_unique').on(table.questionId, table.position),
    uniqueIndex('assessment_options_one_correct').on(table.questionId).where(sql`${table.isCorrect}`),
  ],
)

/**
 * One row per submitted try, written in full at submission (answers are reviewed in the browser first).
 * Score and pass are computed on the server; retries add rows, so history is never overwritten.
 */
export const assessmentAttempts = pgTable(
  'assessment_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => phaseAssessments.id, { onDelete: 'cascade' }),
    attemptNumber: integer('attempt_number').notNull(),
    totalQuestions: integer('total_questions').notNull(),
    correctCount: integer('correct_count').notNull(),
    scorePercent: integer('score_percent').notNull(),
    passed: boolean('passed').notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('assessment_attempts_number_unique').on(table.enrollmentId, table.assessmentId, table.attemptNumber),
    check('assessment_attempts_pass_is_full_score', sql`${table.passed} = (${table.scorePercent} = 100)`),
  ],
)

export const assessmentAnswers = pgTable(
  'assessment_answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assessmentAttemptId: uuid('assessment_attempt_id')
      .notNull()
      .references(() => assessmentAttempts.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => assessmentQuestions.id, { onDelete: 'cascade' }),
    selectedOptionId: uuid('selected_option_id').references(() => assessmentOptions.id, { onDelete: 'set null' }),
    textAnswer: text('text_answer'),
    isCorrect: boolean('is_correct').notNull(),
  },
  (table) => [uniqueIndex('assessment_answers_attempt_question_unique').on(table.assessmentAttemptId, table.questionId)],
)

/** A phase is completed for an attempt when its assessment is passed (or it has none and every topic is passed). */
export const phaseCompletions = pgTable(
  'phase_completions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    phaseId: uuid('phase_id')
      .notNull()
      .references(() => phases.id, { onDelete: 'cascade' }),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('phase_completions_enrollment_phase_unique').on(table.enrollmentId, table.phaseId)],
)

export type PhaseAssessment = typeof phaseAssessments.$inferSelect
export type AssessmentAttempt = typeof assessmentAttempts.$inferSelect
export type PhaseCompletion = typeof phaseCompletions.$inferSelect
