'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@iconify/react'
import { Show, SignInButton, SignOutButton, UserButton, useUser } from '@clerk/nextjs'
import { cn } from '@workspace/ui/lib/utils'
import { GetStartedButton } from '@/components/auth/get-started-button'
import { ADMIN_ROUTES, LEARNER_ROUTES } from '@/lib/routes'
import { darkPill } from '@/lib/styles'

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Streams', href: '/streams' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'About', href: '/#about' },
  { label: 'Contact', href: '/#contact' },
]

const mobileLink =
  'rounded-2xl px-4 py-3 text-sm font-medium text-ink hover:bg-sand/60 aria-[current=page]:bg-sand/60 dark:text-cream dark:hover:bg-cocoa dark:aria-[current=page]:bg-cocoa'

const textLink =
  'text-sm text-taupe transition-colors duration-150 hover:text-ink dark:text-sand/70 dark:hover:text-cream'

function AdminLink({ className }: { className: string }) {
  const { user } = useUser()
  if (user?.publicMetadata?.role !== 'admin') return null
  return (
    <Link href={ADMIN_ROUTES.dashboard} className={className}>
      Admin
    </Link>
  )
}

export function PublicHeader() {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-50 bg-cream/85 backdrop-blur-md dark:bg-[#100c0a]/85">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:gap-6 sm:px-6 lg:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-gold-soft to-gold text-espresso">
            <Icon icon="solar:bezier-bold" width={16} />
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight text-ink dark:text-cream">
            Arcway
          </span>
        </Link>

        <nav aria-label="Primary" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 lg:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  textLink,
                  'relative py-1',
                  active &&
                    'text-ink after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-gold dark:text-cream',
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex min-w-0 items-center gap-2 sm:gap-5">
          <Show when="signed-out">
            <SignInButton mode="modal" forceRedirectUrl={LEARNER_ROUTES.status}>
              <button className={cn(textLink, 'hidden sm:inline-flex')}>Sign in</button>
            </SignInButton>
          </Show>
          <AdminLink className={cn(textLink, 'hidden sm:inline-flex')} />
          <Show when="signed-in">
            <SignOutButton>
              <button className={cn(textLink, 'hidden sm:inline-flex')}>Sign out</button>
            </SignOutButton>
          </Show>
          <GetStartedButton className={cn(darkPill, 'hidden min-[420px]:inline-flex')} />
          <Show when="signed-in">
            <UserButton />
          </Show>

          <button
            className="grid size-10 shrink-0 place-items-center rounded-full text-ink hover:bg-sand/60 lg:hidden dark:text-cream dark:hover:bg-cocoa"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Toggle navigation menu"
            onClick={() => setOpen((v) => !v)}
          >
            <Icon icon={open ? 'solar:close-circle-linear' : 'solar:hamburger-menu-linear'} width={22} />
          </button>
        </div>

        <nav
          id="mobile-nav"
          aria-label="Mobile"
          inert={!open}
          className={cn(
            'absolute inset-x-4 top-full flex max-h-[calc(100dvh-5rem)] flex-col gap-1 overflow-y-auto rounded-3xl border border-sand bg-cream p-3 shadow-lg transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none lg:hidden dark:border-cocoa dark:bg-espresso',
            open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0',
          )}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              aria-current={pathname === link.href ? 'page' : undefined}
              className={mobileLink}
            >
              {link.label}
            </Link>
          ))}
          {/* Account actions hidden from the top bar on small screens live here instead. */}
          <div className="mt-1 flex flex-col gap-1 border-t border-sand pt-2 sm:hidden dark:border-cocoa">
            <Show when="signed-out">
              <SignInButton mode="modal" forceRedirectUrl={LEARNER_ROUTES.status}>
                <button type="button" className={cn(mobileLink, 'text-left')} onClick={() => setOpen(false)}>
                  Sign in
                </button>
              </SignInButton>
            </Show>
            <AdminLink className={mobileLink} />
            <Show when="signed-in">
              <SignOutButton>
                <button type="button" className={cn(mobileLink, 'text-left')} onClick={() => setOpen(false)}>
                  Sign out
                </button>
              </SignOutButton>
            </Show>
          </div>
          <div className="px-1 pt-2 min-[420px]:hidden">
            <GetStartedButton className={cn(darkPill, 'w-full')} />
          </div>
        </nav>
      </div>
    </header>
  )
}
