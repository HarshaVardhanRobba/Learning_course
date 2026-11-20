'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@iconify/react'
import { Show, SignInButton, SignOutButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { cn } from '@workspace/ui/lib/utils'
import { darkPill } from '@/lib/styles'

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Courses', href: '/courses' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'About', href: '/#about' },
  { label: 'Contact', href: '/#contact' },
]

const textLink =
  'text-sm text-taupe transition-colors duration-150 hover:text-ink dark:text-sand/70 dark:hover:text-cream'

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-50 bg-cream/85 backdrop-blur-md dark:bg-[#100c0a]/85">
      <div className="relative mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5">
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

        <div className="flex items-center gap-3 sm:gap-5">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className={cn(textLink, 'hidden sm:inline-flex')}>Sign in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className={darkPill}>
                Get started
                <Icon icon="solar:arrow-right-linear" width={16} />
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <SignOutButton>
              <button className={cn(textLink, 'hidden sm:inline-flex')}>Sign out</button>
            </SignOutButton>
            <UserButton />
          </Show>

          <button
            className="grid size-10 place-items-center rounded-full text-ink hover:bg-sand/60 lg:hidden dark:text-cream dark:hover:bg-cocoa"
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
            'absolute inset-x-4 top-full flex flex-col gap-1 rounded-3xl border border-sand bg-cream p-3 shadow-lg transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none lg:hidden dark:border-cocoa dark:bg-espresso',
            open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0',
          )}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-2xl px-4 py-3 text-sm font-medium text-ink hover:bg-sand/60 dark:text-cream dark:hover:bg-cocoa"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
