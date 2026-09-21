import { vi } from 'vitest'
import type { UserRole } from '@/lib/types'

type QueryResult = { data: unknown; error: unknown }

/**
 * A chainable stand-in for a Supabase query builder. Any method returns the
 * chain again; awaiting it — directly or via `single` — resolves the result,
 * so a route that destructures `{ data, error }` sees what it would in
 * production. `insert`/`upsert` record their payload so tests can assert on
 * what a route writes.
 */
function buildChain(result: QueryResult, onWrite: (payload: unknown) => void) {
    const chain: any = new Proxy(() => chain, {
        get(_target, prop) {
            if (prop === 'then') {
                return (onFulfilled?: (value: QueryResult) => unknown) =>
                    Promise.resolve(result).then(onFulfilled)
            }
            if (prop === 'single' || prop === 'maybeSingle') {
                return vi.fn(async () => result)
            }
            if (prop === 'insert' || prop === 'upsert') {
                return vi.fn((payload: unknown) => {
                    onWrite(payload)
                    return chain
                })
            }
            return vi.fn(() => chain)
        },
        apply: () => chain,
    })
    return chain
}

function writeRecorder() {
    const writes: Record<string, unknown[]> = {}
    const record = (table: string) => (payload: unknown) => {
        ;(writes[table] ??= []).push(payload)
    }
    return { writes, record }
}

export type FakeClient = {
    auth: { getUser: ReturnType<typeof vi.fn> }
    from: ReturnType<typeof vi.fn>
    /** Payloads passed to insert/upsert, keyed by table. */
    writes: Record<string, unknown[]>
}

/**
 * A stand-in for the request-scoped client. It answers who is calling and what
 * their role is; every other table resolves to a single generic row.
 *
 * `roleLookupFails` simulates the role lookup itself erroring, which a guard
 * must not confuse with a role that is simply not allowed.
 */
export function fakeRequestClient(opts: {
    user: { id: string } | null
    role?: UserRole | null
    roleLookupFails?: boolean
}): FakeClient {
    const { user, role = null, roleLookupFails = false } = opts
    const { writes, record } = writeRecorder()

    const profileResult: QueryResult = roleLookupFails
        ? { data: null, error: { message: 'lookup exploded' } }
        : { data: role === null ? null : { role }, error: null }

    return {
        auth: {
            getUser: vi.fn(async () => ({ data: { user }, error: null })),
        },
        from: vi.fn((table: string) =>
            buildChain(
                table === 'profiles'
                    ? profileResult
                    : { data: { id: 'row-1' }, error: null },
                record(table)
            )
        ),
        writes,
    }
}

/**
 * A stand-in for the service-role client, which bypasses row level security.
 * Tests assert on whether this was ever built, not just on status codes:
 * a route must not reach for it before the caller's role is established.
 */
export function fakeServiceClient() {
    const { writes, record } = writeRecorder()
    return {
        from: vi.fn((table: string) =>
            buildChain({ data: { id: 'row-1' }, error: null }, record(table))
        ),
        auth: {
            admin: {
                createUser: vi.fn(async () => ({
                    data: { user: { id: 'new-user' } },
                    error: null,
                })),
                deleteUser: vi.fn(async () => ({ error: null })),
                mfa: {
                    listFactors: vi.fn(async () => ({
                        data: { factors: [] },
                        error: null,
                    })),
                    deleteFactor: vi.fn(async () => ({ error: null })),
                },
            },
        },
        writes,
    }
}
