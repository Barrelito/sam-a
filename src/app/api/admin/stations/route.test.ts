import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fakeServiceClient } from '@/test/fake-supabase'
import { signIns, stubServiceCredentials } from '@/test/route-harness'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))

const { createClient: createRequestClient } = await import('@/lib/supabase/server')
const { createClient: createServiceClient } = await import('@supabase/supabase-js')
const { GET } = await import('./route')

const asService = vi.mocked(createServiceClient)
const { signedIn, signedOut } = signIns(vi.mocked(createRequestClient))

describe('/api/admin/stations', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        stubServiceCredentials()
        asService.mockReturnValue(fakeServiceClient() as never)
    })

    it('nekar den som inte är inloggad', async () => {
        signedOut()
        expect((await GET()).status).toBe(401)
    })

    it('eskalerar inte till tjänstenyckeln innan inloggning är styrkt', async () => {
        signedOut()
        await GET()
        expect(asService).not.toHaveBeenCalled()
    })

    // Documents current behaviour, which is knowingly weaker than the rest of
    // this directory: the route serves every station to any signed-in user,
    // through the service key. Task creation, distribution and the VO pages all
    // read it, so a role check here would break them. The real fix is to stop
    // using the service key and serve the caller's own stations instead —
    // tracked separately.
    it('lämnar ut hela stationslistan till vilken inloggad chef som helst', async () => {
        signedIn('station_manager')
        expect([401, 403]).not.toContain((await GET()).status)
    })
})
