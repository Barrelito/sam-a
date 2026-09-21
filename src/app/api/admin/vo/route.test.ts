import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fakeRequestClient, fakeServiceClient } from '@/test/fake-supabase'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))

const { createClient: createRequestClient } = await import('@/lib/supabase/server')
const { createClient: createServiceClient } = await import('@supabase/supabase-js')
const { GET } = await import('./route')

const asRequest = vi.mocked(createRequestClient)
const asService = vi.mocked(createServiceClient)

describe('/api/admin/vo', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
        asService.mockReturnValue(fakeServiceClient() as never)
    })

    it('nekar den som inte är inloggad', async () => {
        asRequest.mockResolvedValue(fakeRequestClient({ user: null }) as never)
        expect((await GET()).status).toBe(401)
    })

    it('nekar den som är inloggad men inte administratör', async () => {
        asRequest.mockResolvedValue(
            fakeRequestClient({ user: { id: 'u1' }, role: 'station_manager' }) as never
        )
        expect((await GET()).status).toBe(403)
    })

    it('eskalerar inte till tjänstenyckeln innan behörighet är styrkt', async () => {
        asRequest.mockResolvedValue(fakeRequestClient({ user: null }) as never)
        await GET()
        expect(asService).not.toHaveBeenCalled()
    })

    it('släpper igenom en administratör', async () => {
        asRequest.mockResolvedValue(
            fakeRequestClient({ user: { id: 'u1' }, role: 'admin' }) as never
        )
        expect([401, 403]).not.toContain((await GET()).status)
    })
})
