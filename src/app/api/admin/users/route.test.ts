import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fakeRequestClient, fakeServiceClient } from '@/test/fake-supabase'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))

const { createClient: createRequestClient } = await import('@/lib/supabase/server')
const { createClient: createServiceClient } = await import('@supabase/supabase-js')
const { GET, POST, PUT, DELETE } = await import('./route')

const asRequest = vi.mocked(createRequestClient)
const asService = vi.mocked(createServiceClient)

function signedIn(role: string | null) {
    asRequest.mockResolvedValue(fakeRequestClient({ user: { id: 'u1' }, role }) as never)
}
function signedOut() {
    asRequest.mockResolvedValue(fakeRequestClient({ user: null }) as never)
}

const post = () =>
    POST(new Request('http://t/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.se', full_name: 'A', role: 'admin' }),
    }) as never)

const put = () =>
    PUT(new Request('http://t/api/admin/users', {
        method: 'PUT',
        body: JSON.stringify({ user_id: 'victim', role: 'admin' }),
    }) as never)

const del = () =>
    DELETE(new Request('http://t/api/admin/users?user_id=victim', {
        method: 'DELETE',
    }) as never)

const writeMethods = [
    ['POST', post],
    ['PUT', put],
    ['DELETE', del],
] as const

describe('/api/admin/users', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
        asService.mockReturnValue(fakeServiceClient() as never)
    })

    describe.each(writeMethods)('%s', (_name, call) => {
        it('nekar den som inte är inloggad', async () => {
            signedOut()
            expect((await call()).status).toBe(401)
        })

        it('nekar den som är inloggad men inte administratör', async () => {
            signedIn('station_manager')
            expect((await call()).status).toBe(403)
        })

        it('eskalerar inte till tjänstenyckeln innan behörighet är styrkt', async () => {
            signedOut()
            await call()
            signedIn('station_manager')
            await call()
            expect(asService).not.toHaveBeenCalled()
        })

        it('släpper igenom en administratör', async () => {
            signedIn('admin')
            expect([401, 403]).not.toContain((await call()).status)
        })
    })

    describe('GET', () => {
        it('nekar den som inte är inloggad', async () => {
            signedOut()
            expect((await GET()).status).toBe(401)
        })

        // Deliberately not admin-only: the assignee dropdowns on tasks read this
        // list, so every signed-in manager needs it. Narrowing what it returns is
        // a separate concern from guarding the write paths.
        it('släpper igenom en inloggad chef', async () => {
            signedIn('station_manager')
            expect([401, 403]).not.toContain((await GET()).status)
        })
    })
})
