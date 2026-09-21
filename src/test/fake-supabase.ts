import { vi } from 'vitest'

type ChainResult = { data: unknown; error: unknown }

/**
 * A chainable stand-in for a Supabase query builder. Any method returns the
 * chain again; `single`/`maybeSingle` resolve, and `insert` records what it was
 * handed so tests can assert on the payload a route writes.
 */
function buildChain(result: ChainResult, onInsert: (payload: unknown) => void) {
    const chain: any = new Proxy(() => chain, {
        get(_target, prop) {
            if (prop === 'then') return undefined
            if (prop === 'single' || prop === 'maybeSingle') {
                return vi.fn(async () => result)
            }
            if (prop === 'insert' || prop === 'upsert') {
                return vi.fn((payload: unknown) => {
                    onInsert(payload)
                    return chain
                })
            }
            return vi.fn(() => chain)
        },
        apply: () => chain,
    })
    return chain
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
 */
export function fakeRequestClient(opts: {
    user: { id: string } | null
    role?: string | null
}): FakeClient {
    const { user, role = null } = opts
    const writes: Record<string, unknown[]> = {}

    return {
        auth: {
            getUser: vi.fn(async () => ({ data: { user }, error: null })),
        },
        from: vi.fn((table: string) =>
            buildChain(
                table === 'profiles'
                    ? { data: role === null ? null : { role }, error: null }
                    : { data: { id: 'row-1' }, error: null },
                payload => {
                    ;(writes[table] ??= []).push(payload)
                }
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
    const writes: Record<string, unknown[]> = {}
    return {
        from: vi.fn((table: string) =>
            buildChain({ data: { id: 'row-1' }, error: null }, payload => {
                ;(writes[table] ??= []).push(payload)
            })
        ),
        auth: {
            admin: {
                createUser: vi.fn(async () => ({
                    data: { user: { id: 'new-user' } },
                    error: null,
                })),
                deleteUser: vi.fn(async () => ({ error: null })),
            },
        },
        writes,
    }
}
