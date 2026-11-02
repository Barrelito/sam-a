import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeServiceClient } from '@/test/fake-supabase'
import { signIns, stubServiceCredentials } from '@/test/route-harness'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))

const { createClient } = await import('@/lib/supabase/server')
const { createClient: createServiceClient } = await import('@supabase/supabase-js')
const { GET, POST } = await import('./route')

const asService = vi.mocked(createServiceClient)

const { signedIn, signedOut } = signIns(vi.mocked(createClient))

const close = (id = 'c26') =>
    POST(new Request(`http://portal.test/api/salary-review/cycles/${id}/close`, { method: 'POST' }), {
        params: Promise.resolve({ id }),
    })

const open2026 = { salary_review_cycles: { data: { id: 'c26', year: 2026, status: 'active' } } }

describe('POST /api/salary-review/cycles/[id]/close: stänga en löneöversyn', () => {
    beforeEach(() => vi.clearAllMocks())

    it('nekar den som inte är inloggad', async () => {
        signedOut()
        expect((await close()).status).toBe(401)
    })

    it.each(['station_manager', 'area_manager', 'assistant_manager'] as const)(
        'nekar %s, eftersom stängning påverkar alla stationer',
        async role => {
            const client = signedIn(role, { tables: open2026 })

            expect((await close()).status).toBe(403)
            expect(client.updates.salary_review_cycles).toBeUndefined()
        }
    )

    it.each(['vo_chief', 'admin'] as const)('låter %s stänga', async role => {
        const client = signedIn(role, { tables: open2026 })

        expect((await close()).status).toBe(200)
        expect(client.updates.salary_review_cycles).toEqual([
            expect.objectContaining({ status: 'completed' }),
        ])
    })

    it('svarar 404 när löneöversynen inte finns', async () => {
        signedIn('admin', { tables: { salary_review_cycles: { data: null } } })
        expect((await close('saknas')).status).toBe(404)
    })

    it('svarar 409 när löneöversynen redan är stängd', async () => {
        const client = signedIn('admin', {
            tables: { salary_review_cycles: { data: { id: 'c25', year: 2025, status: 'completed' } } },
        })

        expect((await close('c25')).status).toBe(409)
        expect(client.updates.salary_review_cycles).toBeUndefined()
    })

    it('loggar vem som stängde och vilket år', async () => {
        const client = signedIn('vo_chief', { tables: open2026 })

        await close()

        expect(client.writes.audit_logs).toEqual([
            expect.objectContaining({
                user_id: 'u1',
                action: 'CLOSE_SALARY_REVIEW_CYCLE',
                resource_id: 'c26',
                details: expect.objectContaining({ year: 2026 }),
            }),
        ])
    })
})

describe('GET /api/salary-review/cycles/[id]/close: hur mycket som inte är klart', () => {
    const preview = (id = 'c26') =>
        GET(new Request(`http://portal.test/api/salary-review/cycles/${id}/close`), {
            params: Promise.resolve({ id }),
        })

    beforeEach(() => {
        vi.clearAllMocks()
        stubServiceCredentials()
    })

    it('nekar den som inte är inloggad, utan att använda tjänstenyckeln', async () => {
        signedOut()
        expect((await preview()).status).toBe(401)
        expect(asService).not.toHaveBeenCalled()
    })

    it.each(['station_manager', 'area_manager', 'assistant_manager'] as const)(
        'nekar %s, utan att använda tjänstenyckeln',
        async role => {
            signedIn(role)
            expect((await preview()).status).toBe(403)
            expect(asService).not.toHaveBeenCalled()
        }
    )

    it('räknar alla medarbetare i hela organisationen utan klar lönesättning, även de som aldrig öppnats', async () => {
        signedIn('vo_chief')
        // 52 medarbetare totalt; 42 klara lönesättningar i 2026
        asService.mockReturnValue(fakeServiceClient({
            tables: {
                salary_review_cycles: { data: { id: 'c26', year: 2026, status: 'active' } },
                employees: { count: 52 },
                salary_reviews: { count: 42 },
            },
        }) as never)

        const response = await preview()

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ year: 2026, total: 52, unfinished: 10 })
    })

    it('svarar 404 när löneöversynen inte finns', async () => {
        signedIn('admin')
        asService.mockReturnValue(fakeServiceClient({
            tables: { salary_review_cycles: { data: null } },
        }) as never)

        expect((await preview('saknas')).status).toBe(404)
    })
})
