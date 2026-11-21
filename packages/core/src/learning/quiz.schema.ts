import { z } from 'zod'

/**
 * A submitted answer. The `kind` discriminator must match the question's stored kind; the server rejects
 * a mismatch, so an MCQ can never be graded as text or the other way round.
 */
export const quizAnswerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('mcq'), optionId: z.uuid() }),
  z.object({ kind: z.literal('fill_blank'), text: z.string().trim().min(1, 'Type an answer first.').max(500) }),
])

export type QuizAnswerInput = z.infer<typeof quizAnswerSchema>

export const submitQuizAnswerSchema = z.object({
  quizAttemptId: z.uuid(),
  questionId: z.uuid(),
  answer: quizAnswerSchema,
})

export type SubmitQuizAnswerInput = z.infer<typeof submitQuizAnswerSchema>
