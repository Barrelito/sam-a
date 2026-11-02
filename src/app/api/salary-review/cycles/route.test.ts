import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { signIns } from '@/test/route-harness'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

const { createClient } = await import('@/lib/supabase/server')
const { POST } = await import('./route')

const { signedIn, signedOut } = signIns(vi.mocked(createClient))

const start = (body: unknown) =>
    POST(new Request('http://portal.test/api/salary-review/cycles', {
        method: 'POST',
        body: JSON.stringify(body),
    }))

// 2027 finns inte än; när den skapats svarar tabellen med den nya raden.
const noNextYearYet = {
    salary_review_cycles: [{ data: null }, { data: { id: 'c27', year: 2027, status: 'active' } }],
}

describe('POST /api/salary-review/cycles: starta nästa års löneöversyn', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-11-02T10:00:00Z'))
    })
    afterEach(() => vi.useRealTimers())

    it('nekar den som inte är inloggad', async () => {
        signedOut()
        expect((await start({ year: 2027 })).status).toBe(401)
    })

    it.each(['station_manager', 'area_manager', 'vo_chief', 'admin'] as const)(
        'låter %s starta nästa år',
        async role => {
            const client = signedIn(role, { tables: noNextYearYet })

            const response = await start({ year: 2027 })

            expect(response.status).toBe(201)
            expect(client.writes.salary_review_cycles).toEqual([
                expect.objectContaining({ year: 2027, status: 'active', created_by: 'u1' }),
            ])
        }
    )

    it('nekar biträdande chef', async () => {
        const client = signedIn('assistant_manager', { tables: noNextYearYet })

        expect((await start({ year: 2027 })).status).toBe(403)
        expect(client.writes.salary_review_cycles).toBeUndefined()
    })

    it.each([2026, 2025, 2028])('nekar att starta %i, eftersom bara nästa år får startas', async year => {
        const client = signedIn('station_manager', { tables: noNextYearYet })

        expect((await start({ year })).status).toBe(400)
        expect(client.writes.salary_review_cycles).toBeUndefined()
    })

    it('svarar 409 och skapar ingenting när nästa år redan finns', async () => {
        const client = signedIn('station_manager', {
            tables: { salary_review_cycles: { data: { id: 'c27', year: 2027 } } },
        })

        expect((await start({ year: 2027 })).status).toBe(409)
        expect(client.writes.salary_review_cycles).toBeUndefined()
    })

    it('svarar 409 när någon annan hann starta samma år samtidigt', async () => {
        signedIn('station_manager', {
            tables: {
                salary_review_cycles: [{ data: null }, { data: null, error: { code: '23505' } }],
            },
        })

        expect((await start({ year: 2027 })).status).toBe(409)
    })

    it('loggar vem som startade och vilket år', async () => {
        const client = signedIn('station_manager', { tables: noNextYearYet })

        await start({ year: 2027 })

        expect(client.writes.audit_logs).toEqual([
            expect.objectContaining({
                user_id: 'u1',
                action: 'START_SALARY_REVIEW_CYCLE',
                resource_id: 'c27',
                details: expect.objectContaining({ year: 2027 }),
            }),
        ])
    })
})
