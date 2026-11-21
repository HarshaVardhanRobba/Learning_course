import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from './routers/_app'

/** Inferred from the router: use these instead of hand-written API types. */
export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>
