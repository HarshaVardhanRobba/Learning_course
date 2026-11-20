import { z } from 'zod'

export const applicationInputSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name.').max(80, 'Keep it under 80 characters.'),
  lastName: z.string().trim().min(1, 'Enter your last name.').max(80, 'Keep it under 80 characters.'),
  phone: z
    .string()
    .trim()
    .min(1, 'Enter your mobile number.')
    .transform((value) => value.replace(/[\s\-().]/g, ''))
    .pipe(z.string().regex(/^\+[1-9]\d{6,14}$/, 'Include your country code, e.g. +91 98765 43210.')),
})

export type ApplicationInput = z.infer<typeof applicationInputSchema>
export type ApplicationField = keyof ApplicationInput

export const applicationDecisionSchema = z.discriminatedUnion('decision', [
  z.object({ applicationId: z.uuid(), decision: z.literal('approve') }),
  z.object({
    applicationId: z.uuid(),
    decision: z.literal('reject'),
    reason: z
      .string()
      .trim()
      .min(1, 'Enter a reason for rejecting this application.')
      .max(500, 'Keep the reason under 500 characters.'),
  }),
])

export type ApplicationDecision = z.infer<typeof applicationDecisionSchema>
