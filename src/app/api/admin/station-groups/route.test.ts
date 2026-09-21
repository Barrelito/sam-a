import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fakeRequestClient } from '@/test/fake-supabase'
import type { FakeClient } from '@/test/fake-supabase'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))

const { createClient: createRequestClient } = await import('@/lib/supabase/server')
const { GET, POST } = await import('./route')

const asRequest = vi.mocked(createRequestClient)

function use(client: FakeClient) {
    asRequest.mockResolvedValue(client as never)
    return client
}

const post = (body: Record<string, unknown>) =>
    POST(new Request('http://t/api/admin/station-groups', {
        method: 'POST',
        body: JSON.stringify(body),
    }) as never)

const validBody = {
    name: 'Söderort',
    vo_id: 'vo1',
    station_ids: ['s1', 's2'],
}

describe('/api/admin/station-groups', () => {
    beforeEach(() => vi.clearAllMocks())

    describe('POST', () => {
        it('nekar den som inte är inloggad', async () => {
            use(fakeRequestClient({ user: null }))
            expect((await post(validBody)).status).toBe(401)
        })

        it('nekar den som är inloggad men inte administratör', async () => {
            use(fakeRequestClient({ user: { id: 'u1' }, role: 'station_manager' }))
            expect((await post(validBody)).status).toBe(403)
        })

        it('släpper igenom en administratör', async () => {
            use(fakeRequestClient({ user: { id: 'u1' }, role: 'admin' }))
            expect([401, 403]).not.toContain((await post(validBody)).status)
        })

        it('hämtar vem som skapat stationsområdet från sessionen, inte från anropet', async () => {
            const client = use(fakeRequestClient({ user: { id: 'the-admin' }, role: 'admin' }))

            await post({ ...validBody, created_by: 'someone-else' })

            const written = client.writes['station_groups']?.[0] as { created_by?: string }
            expect(written.created_by).toBe('the-admin')
        })
    })

    describe('GET', () => {
        it('nekar den som inte är inloggad', async () => {
            use(fakeRequestClient({ user: null }))
            expect((await GET()).status).toBe(401)
        })

        // Not admin-only: the tasks page and the dashboard read this list.
        it('släpper igenom en inloggad chef', async () => {
            use(fakeRequestClient({ user: { id: 'u1' }, role: 'station_manager' }))
            expect([401, 403]).not.toContain((await GET()).status)
        })
    })
})
