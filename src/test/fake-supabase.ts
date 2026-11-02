import { vi } from 'vitest'
import type { UserRole } from '@/lib/types'

type QueryResult = { data: unknown; error: unknown; count?: number | null }

/**
 * What a test may say a table answers: `error` and `data` default to null.
 * `count` is what a `{ count: 'exact' }` select reports.
 */
export type TableResult = { data?: unknown; error?: unknown; count?: number }

/**
 * Per-table answers. A list is consumed one entry per `from(table)` call, in
 * order, and its last entry repeats once the list runs out — so a route that
 * first looks a row up and then inserts it can see two different answers.
 */
export type TableResults = Record<string, TableResult | TableResult[]>

const GENERIC_ROW: QueryResult = { data: { id: 'row-1' }, error: null }

function tableAnswers(tables: TableResults = {}) {
    const calls: Record<string, number> = {}
    return (table: string): QueryResult | undefined => {
        const configured = tables[table]
        if (configured === undefined) return undefined
        const list = Array.isArray(configured) ? configured : [configured]
        const index = Math.min(calls[table] ?? 0, list.length - 1)
        calls[table] = (calls[table] ?? 0) + 1
        const picked = list[index] ?? {}
        return {
            data: picked.data ?? null,
            error: picked.error ?? null,
            ...(picked.count !== undefined && { count: picked.count }),
        }
    }
}

/**
 * A chainable stand-in for a Supabase query builder. Any method returns the
 * chain again; awaiting it — directly or via `single` — resolves the result,
 * so a route that destructures `{ data, error }` sees what it would in
 * production. `insert`/`upsert` record their payload so tests can assert on
 * what a route writes.
 */
function buildChain(
    result: QueryResult,
    onWrite: (payload: unknown) => void,
    onUpdate: (payload: unknown) => void = () => {}
) {
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
            if (prop === 'update') {
                return vi.fn((payload: unknown) => {
                    onUpdate(payload)
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
    const updates: Record<string, unknown[]> = {}
    const record = (table: string) => (payload: unknown) => {
        ;(writes[table] ??= []).push(payload)
    }
    const recordUpdate = (table: string) => (payload: unknown) => {
        ;(updates[table] ??= []).push(payload)
    }
    return { writes, record, updates, recordUpdate }
}

export type FakeClient = {
    auth: { getUser: ReturnType<typeof vi.fn> }
    from: ReturnType<typeof vi.fn>
    /** Payloads passed to insert/upsert, keyed by table. */
    writes: Record<string, unknown[]>
    /** Payloads passed to update, keyed by table. */
    updates: Record<string, unknown[]>
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
    /** Answers per table; `profiles` here overrides the role lookup. */
    tables?: TableResults
}): FakeClient {
    const { user, role = null, roleLookupFails = false, tables } = opts
    const { writes, record, updates, recordUpdate } = writeRecorder()
    const answerFor = tableAnswers(tables)

    const profileResult: QueryResult = roleLookupFails
        ? { data: null, error: { message: 'lookup exploded' } }
        : { data: role === null ? null : { role }, error: null }

    return {
        auth: {
            getUser: vi.fn(async () => ({ data: { user }, error: null })),
        },
        from: vi.fn((table: string) =>
            buildChain(
                answerFor(table) ??
                    (table === 'profiles' ? profileResult : GENERIC_ROW),
                record(table),
                recordUpdate(table)
            )
        ),
        writes,
        updates,
    }
}

/**
 * A stand-in for the service-role client, which bypasses row level security.
 * Tests assert on whether this was ever built, not just on status codes:
 * a route must not reach for it before the caller's role is established.
 */
export function fakeServiceClient(opts: { tables?: TableResults } = {}) {
    const { writes, record, updates, recordUpdate } = writeRecorder()
    const answerFor = tableAnswers(opts.tables)
    return {
        from: vi.fn((table: string) =>
            buildChain(answerFor(table) ?? GENERIC_ROW, record(table), recordUpdate(table))
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
        updates,
    }
}
