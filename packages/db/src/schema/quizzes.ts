import { sql } from 'drizzle-orm'
import { boolean, check, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { topics } from './courses'
import { enrollments } from './enrollments'

/** Only these two kinds exist. */
export const quizQuestionKind = pgEnum('quiz_question_kind', ['mcq', 'fill_blank'])

/** One quiz per topic. It belongs to the topic's course version, so attempts always see that version's questions. */
export const topicQuizzes = pgTable('topic_quizzes', {
  id: uuid('id').primaryKey().defaultRandom(),
  topicId: uuid('topic_id')
    .notNull()
    .unique()
    .references(() => topics.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  instructions: text('instructions').notNull().default(''),
})

export const quizQuestions = pgTable(
  'quiz_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => topicQuizzes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    kind: quizQuestionKind('kind').notNull(),
    prompt: text('prompt').notNull(),
    /** Fill-in-the-blank only: accepted answers, compared case-insensitively with normalized whitespace. */
    acceptedAnswers: text('accepted_answers').array().notNull().default(sql`'{}'::text[]`),
    /** Shown after the learner answers. */
    explanation: text('explanation').notNull().default(''),
  },
  (table) => [
    uniqueIndex('quiz_questions_quiz_position_unique').on(table.quizId, table.position),
    check(
      'quiz_questions_answers_by_kind',
      sql`(${table.kind} = 'fill_blank' and cardinality(${table.acceptedAnswers}) > 0) or (${table.kind} = 'mcq' and cardinality(${table.acceptedAnswers}) = 0)`,
    ),
  ],
)

export const quizOptions = pgTable(
  'quiz_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => quizQuestions.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    label: text('label').notNull(),
    isCorrect: boolean('is_correct').notNull().default(false),
  },
  (table) => [
    uniqueIndex('quiz_options_question_position_unique').on(table.questionId, table.position),
    // An MCQ has exactly one stored correct option; this blocks a second one.
    uniqueIndex('quiz_options_one_correct').on(table.questionId).where(sql`${table.isCorrect}`),
  ],
)

/** One row per try. Retries create new rows, so every earlier score is kept per enrollment attempt. */
export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => topicQuizzes.id, { onDelete: 'cascade' }),
    attemptNumber: integer('attempt_number').notNull(),
    totalQuestions: integer('total_questions').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    correctCount: integer('correct_count'),
    scorePercent: integer('score_percent'),
    passed: boolean('passed').notNull().default(false),
  },
  (table) => [
    uniqueIndex('quiz_attempts_enrollment_quiz_number_unique').on(table.enrollmentId, table.quizId, table.attemptNumber),
    // At most one unfinished try per quiz and enrollment attempt.
    uniqueIndex('quiz_attempts_one_open').on(table.enrollmentId, table.quizId).where(sql`${table.finishedAt} is null`),
    check(
      'quiz_attempts_result_when_finished',
      sql`(${table.finishedAt} is null and ${table.scorePercent} is null and not ${table.passed}) or (${table.finishedAt} is not null and ${table.scorePercent} is not null)`,
    ),
  ],
)

export const quizAnswers = pgTable(
  'quiz_answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quizAttemptId: uuid('quiz_attempt_id')
      .notNull()
      .references(() => quizAttempts.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => quizQuestions.id, { onDelete: 'cascade' }),
    selectedOptionId: uuid('selected_option_id').references(() => quizOptions.id, { onDelete: 'set null' }),
    textAnswer: text('text_answer'),
    isCorrect: boolean('is_correct').notNull(),
    answeredAt: timestamp('answered_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One answer per question per try; a retry is a new try.
    uniqueIndex('quiz_answers_attempt_question_unique').on(table.quizAttemptId, table.questionId),
  ],
)

export type TopicQuiz = typeof topicQuizzes.$inferSelect
export type QuizQuestion = typeof quizQuestions.$inferSelect
export type QuizQuestionKind = (typeof quizQuestionKind.enumValues)[number]
export type QuizOption = typeof quizOptions.$inferSelect
export type QuizAttempt = typeof quizAttempts.$inferSelect
export type QuizAnswer = typeof quizAnswers.$inferSelect
