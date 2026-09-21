import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fakeServiceClient } from '@/test/fake-supabase'
import { signIns, stubServiceCredentials } from '@/test/route-harness'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))

const { createClient: createRequestClient } = await import('@/lib/supabase/server')
const { createClient: createServiceClient } = await import('@supabase/supabase-js')
const { GET, PUT, DELETE } = await import('./route')

const asService = vi.mocked(createServiceClient)
const { signedIn, signedOut } = signIns(vi.mocked(createRequestClient))

const params = { params: Promise.resolve({ id: 'g1' }) }

const methods = [
    ['GET', () => GET(new Request('http://t/api/admin/station-groups/g1') as never, params)],
    ['PUT', () => PUT(new Request('http://t/api/admin/station-groups/g1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Nytt namn' }),
    }) as never, params)],
    ['DELETE', () => DELETE(new Request('http://t/api/admin/station-groups/g1', {
        method: 'DELETE',
    }) as never, params)],
] as const

describe('/api/admin/station-groups/[id]', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        stubServiceCredentials()
        asService.mockReturnValue(fakeServiceClient() as never)
    })

    describe.each(methods)('%s', (_name, call) => {
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

        it('släpper igenom en administratör ända fram till det privilegierade arbetet', async () => {
            signedIn('admin')
            expect([401, 403]).not.toContain((await call()).status)
            expect(asService).toHaveBeenCalled()
        })
    })
})
