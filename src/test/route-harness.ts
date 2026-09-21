import { fakeRequestClient, type FakeClient } from './fake-supabase'
import type { UserRole } from '@/lib/types'

type ResolvesTo = { mockResolvedValue: (value: never) => unknown }

/**
 * Drive the identity a route sees. Pass the test file's mocked
 * `createClient` from `@/lib/supabase/server`; the mock has to be declared per
 * file because `vi.mock` is hoisted there.
 */
export function signIns(asRequestClient: ResolvesTo) {
    const use = (client: FakeClient) => {
        asRequestClient.mockResolvedValue(client as never)
        return client
    }
    return {
        signedOut: () => use(fakeRequestClient({ user: null })),
        signedIn: (role: UserRole | null) =>
            use(fakeRequestClient({ user: { id: 'u1' }, role })),
        roleLookupFails: () =>
            use(fakeRequestClient({ user: { id: 'u1' }, roleLookupFails: true })),
    }
}

/** The service-role client refuses to be built without these. */
export function stubServiceCredentials() {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
}
