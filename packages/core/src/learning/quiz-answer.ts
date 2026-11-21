import type { QuestionWithKey } from './quiz.repository'
import type { QuizAnswerInput } from './quiz.schema'

/**
 * Fill-in-the-blank comparison. Both the stored answers and the learner's text go through the same
 * normalization: Unicode NFKC, trimmed, internal whitespace collapsed to one space, lower-cased.
 */
export function normalizeAnswer(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en')
}

export function isFillBlankCorrect(answer: string, accepted: readonly string[]): boolean {
  const given = normalizeAnswer(answer)
  return given.length > 0 && accepted.some((a) => normalizeAnswer(a) === given)
}

/** 100% is the only passing score. */
export function scoreQuiz(correct: number, total: number) {
  const scorePercent = total ? Math.floor((correct / total) * 100) : 0
  return { scorePercent, passed: total > 0 && correct === total }
}

/** What a learner may see of a question before answering it: never the answer key. */
export type PublicQuestion =
  | { id: string; position: number; kind: 'mcq'; prompt: string; options: { id: string; label: string }[] }
  | { id: string; position: number; kind: 'fill_blank'; prompt: string }

export type CorrectAnswer = { kind: 'mcq'; optionId: string; label: string } | { kind: 'fill_blank'; answer: string }

/** Returned only for questions the learner has already answered. */
export type AnswerFeedback = {
  questionId: string
  isCorrect: boolean
  given: QuizAnswerInput
  correct: CorrectAnswer
  explanation: string
}

export function toPublic(q: QuestionWithKey): PublicQuestion {
  return q.kind === 'mcq'
    ? { id: q.id, position: q.position, kind: 'mcq', prompt: q.prompt, options: q.options.map(({ id, label }) => ({ id, label })) }
    : { id: q.id, position: q.position, kind: 'fill_blank', prompt: q.prompt }
}

export function correctAnswerOf(q: QuestionWithKey): CorrectAnswer {
  if (q.kind === 'mcq') {
    const option = q.options.find((o) => o.isCorrect)
    return { kind: 'mcq', optionId: option?.id ?? '', label: option?.label ?? '' }
  }
  return { kind: 'fill_blank', answer: q.acceptedAnswers[0] ?? '' }
}

export function toFeedback(q: QuestionWithKey, row: { isCorrect: boolean; selectedOptionId: string | null; textAnswer: string | null }): AnswerFeedback {
  const given: QuizAnswerInput =
    q.kind === 'mcq' ? { kind: 'mcq', optionId: row.selectedOptionId ?? '' } : { kind: 'fill_blank', text: row.textAnswer ?? '' }
  return { questionId: q.id, isCorrect: row.isCorrect, given, correct: correctAnswerOf(q), explanation: q.explanation }
}

/** MCQ: the chosen option must be the stored correct one. Fill-in: normalized, case-insensitive match. */
export function grade(q: QuestionWithKey, answer: QuizAnswerInput): boolean | null {
  if (q.kind !== answer.kind) return null
  if (answer.kind === 'mcq') {
    const option = q.options.find((o) => o.id === answer.optionId)
    return option ? option.isCorrect : null
  }
  return isFillBlankCorrect(answer.text, q.acceptedAnswers)
}

