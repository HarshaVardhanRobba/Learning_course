'use client'

import * as React from 'react'
import { Icon } from '@iconify/react'
import { submitApplicationAction, type ApplyFormState } from '@/app/(learner)/learner/application/actions'
import { darkPill } from '@/lib/styles'

const inputClass =
  'mt-2 w-full rounded-2xl border border-sand bg-white px-4 py-3 text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-taupe/60 focus:border-gold focus:ring-4 focus:ring-gold/15 aria-invalid:border-rose-400 aria-invalid:ring-rose-200/50 disabled:cursor-not-allowed disabled:bg-sand/40 disabled:text-taupe dark:border-cocoa dark:bg-espresso dark:text-cream'

type Defaults = { firstName: string; lastName: string; email: string }

export function ApplicationForm({ defaults }: { defaults: Defaults }) {
  const [state, formAction, pending] = React.useActionState<ApplyFormState, FormData>(submitApplicationAction, {})
  const errors = state.fieldErrors ?? {}
  const value = (field: 'firstName' | 'lastName' | 'phone') =>
    state.values?.[field] ?? (field === 'phone' ? '' : defaults[field])

  return (
    <form action={formAction} noValidate className="space-y-6" aria-describedby={state.message ? 'form-error' : undefined}>
      {state.message && (
        <p id="form-error" role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          {state.message}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="firstName" label="First name" error={errors.firstName}>
          <input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            required
            maxLength={80}
            defaultValue={value('firstName')}
            aria-invalid={errors.firstName ? true : undefined}
            aria-describedby={errors.firstName ? 'firstName-error' : undefined}
            className={inputClass}
          />
        </Field>
        <Field id="lastName" label="Last name" error={errors.lastName}>
          <input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            required
            maxLength={80}
            defaultValue={value('lastName')}
            aria-invalid={errors.lastName ? true : undefined}
            aria-describedby={errors.lastName ? 'lastName-error' : undefined}
            className={inputClass}
          />
        </Field>
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-medium text-ink dark:text-cream">
          Email
        </label>
        <input id="email" type="email" value={defaults.email} disabled readOnly aria-describedby="email-hint" className={inputClass} />
        <p id="email-hint" className="mt-1.5 text-xs text-taupe dark:text-sand/60">
          From your signed-in account. We’ll send the decision here.
        </p>
      </div>

      <Field id="phone" label="Mobile number" error={errors.phone} hint="Include your country code, e.g. +91 98765 43210.">
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="+91 98765 43210"
          defaultValue={value('phone')}
          aria-invalid={errors.phone ? true : undefined}
          aria-describedby={errors.phone ? 'phone-error' : 'phone-hint'}
          className={inputClass}
        />
      </Field>

      <div className="flex flex-col-reverse items-start gap-4 border-t border-sand pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-cocoa">
        <p className="text-xs text-taupe dark:text-sand/60">
          <span aria-hidden="true" className="text-rose-600">*</span> Required. You can submit one application.
        </p>
        <button type="submit" disabled={pending} className={`${darkPill} px-6 py-3 disabled:cursor-wait disabled:opacity-70`}>
          {pending ? 'Submitting…' : 'Submit application'}
          {!pending && <Icon icon="solar:arrow-right-linear" width={16} />}
        </button>
      </div>
    </form>
  )
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ink dark:text-cream">
        {label} <span aria-hidden="true" className="text-rose-600">*</span>
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-300">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-taupe dark:text-sand/60">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
