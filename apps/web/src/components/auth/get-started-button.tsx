'use client'

import * as React from 'react'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Show, SignInButton } from '@clerk/nextjs'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { LEARNER_ROUTES } from '@/lib/routes'
import { darkPill } from '@/lib/styles'

/** Signed-out visitors are asked to sign in first; signed-in users go to the status page, which forwards approved learners to the dashboard. */
export function GetStartedButton({ className }: { className: string }) {
  const [open, setOpen] = React.useState(false)

  const content = (
    <>
      Get started
      <Icon icon="solar:arrow-right-linear" width={16} />
    </>
  )

  return (
    <>
      <Show when="signed-out">
        <button type="button" className={className} onClick={() => setOpen(true)}>
          {content}
        </button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="rounded-[1.75rem] border-sand bg-cream p-6 sm:max-w-md sm:p-7 dark:border-cocoa dark:bg-espresso">
            <DialogHeader>
              <span className="mb-2 grid size-12 place-items-center rounded-full bg-gold/15 text-gold">
                <Icon icon="solar:lock-keyhole-minimalistic-linear" width={22} />
              </span>
              <DialogTitle className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-ink dark:text-cream">
                Sign in first
              </DialogTitle>
              <DialogDescription className="text-taupe dark:text-sand/70">
                Sign in first, then work on getting started.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="m-0 mt-2 gap-2 border-0 bg-transparent p-0 sm:justify-end">
              <DialogClose className="rounded-full px-5 py-2.5 text-sm font-medium text-taupe transition-colors duration-150 hover:text-ink dark:text-sand/70 dark:hover:text-cream">
                Cancel
              </DialogClose>
              <SignInButton mode="modal" forceRedirectUrl={LEARNER_ROUTES.status} signUpForceRedirectUrl={LEARNER_ROUTES.status}>
                <button type="button" className={darkPill} onClick={() => setOpen(false)}>
                  Sign in
                  <Icon icon="solar:arrow-right-linear" width={16} />
                </button>
              </SignInButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Show>
      <Show when="signed-in">
        <Link href={LEARNER_ROUTES.status} className={className}>
          {content}
        </Link>
      </Show>
    </>
  )
}
