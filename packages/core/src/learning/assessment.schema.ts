import { z } from 'zod'
import { quizAnswerSchema } from './quiz.schema'

/**
 * The whole assessment is submitted at once, after the learner reviews it. Each question id may appear
 * only once; the server additionally requires every question of the assessment to be answered.
 */
export const submitAssessmentSchema = z.object({
  assessmentId: z.uuid(),
  answers: z
    .array(z.object({ questionId: z.uuid(), answer: quizAnswerSchema }))
    .min(1)
    .max(200)
    .refine((list) => new Set(list.map((a) => a.questionId)).size === list.length, 'Each question can be answered only once.'),
})

export type SubmitAssessmentInput = z.infer<typeof submitAssessmentSchema>
