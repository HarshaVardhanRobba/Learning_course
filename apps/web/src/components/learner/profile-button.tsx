'use client'

import { Icon } from '@iconify/react'
import { useClerk } from '@clerk/nextjs'

/** Opens Clerk's account modal, where the learner manages name, email, and security settings. */
export function ProfileButton({ className }: { className: string }) {
  const clerk = useClerk()
  return (
    <button type="button" className={className} onClick={() => clerk.openUserProfile()}>
      <Icon icon="solar:user-circle-linear" width={18} />
      Profile
    </button>
  )
}
