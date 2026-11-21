import { requireAdmin } from '@workspace/auth'

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  await requireAdmin()
  return <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">{children}</div>
}
