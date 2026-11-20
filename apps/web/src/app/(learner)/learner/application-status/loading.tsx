import { StatusShell } from '@/components/application/application-status-view'

const block = 'animate-pulse rounded-full bg-sand/70 motion-reduce:animate-none dark:bg-cocoa'

export default function Loading() {
  return (
    <StatusShell>
      <div
        role="status"
        aria-label="Loading your application status"
        className="rounded-[1.75rem] border border-sand bg-white/70 px-6 py-10 dark:border-cocoa dark:bg-cocoa/40"
      >
        <div className={`mx-auto size-20 ${block}`} />
        <div className={`mx-auto mt-6 h-9 w-64 ${block}`} />
        <div className={`mx-auto mt-4 h-4 w-80 max-w-full ${block}`} />
        <div className="mx-auto mt-10 flex max-w-md justify-between px-6">
          <div className={`size-9 ${block}`} />
          <div className={`size-9 ${block}`} />
          <div className={`size-9 ${block}`} />
        </div>
      </div>
      <div className="flex items-center gap-5 rounded-[1.75rem] border border-sand bg-white/70 p-6 dark:border-cocoa dark:bg-cocoa/40">
        <div className="size-14 animate-pulse rounded-2xl bg-sand/70 motion-reduce:animate-none dark:bg-cocoa" />
        <div className="flex-1 space-y-2">
          <div className={`h-4 w-40 ${block}`} />
          <div className={`h-3 w-56 ${block}`} />
        </div>
      </div>
    </StatusShell>
  )
}
