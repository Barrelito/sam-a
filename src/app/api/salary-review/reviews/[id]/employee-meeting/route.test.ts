import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { signIns } from '@/test/route-harness'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

const { createClient } = await import('@/lib/supabase/server')
const { GET, PUT } = await import('./route')

const { signedIn, signedOut } = signIns(vi.mocked(createClient))

const ctx = { params: Promise.resolve({ id: 'r1' }) }
const save = (body: unknown) =>
    PUT(new Request('http://portal.test/api/salary-review/reviews/r1/employee-meeting', {
        method: 'PUT',
        body: JSON.stringify(body),
    }), ctx)

const openReview = {
    salary_reviews: { data: { id: 'r1', cycle: { year: 2027, status: 'active' } } },
    salary_employee_meetings: { data: { id: 'm1' } },
}

describe('/api/salary-review/reviews/[id]/employee-meeting: medarbetarsamtal', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-11-20T09:00:00Z'))
    })
    afterEach(() => vi.useRealTimers())

    it('nekar den som inte är inloggad', async () => {
        signedOut()
        expect((await save({ agreements: 'x' })).status).toBe(401)
        signedOut()
        expect((await GET(new Request('http://portal.test'), ctx)).status).toBe(401)
    })

    it('svarar 404 när lönesättningen inte finns eller inte är synlig för chefen', async () => {
        const client = signedIn('station_manager', { tables: { salary_reviews: { data: null } } })

        expect((await save({ agreements: 'x' })).status).toBe(404)
        expect(client.writes.salary_employee_meetings).toBeUndefined()
    })

    it('sparar datum, överenskommelser, utvecklingsbehov och anteckningar', async () => {
        const client = signedIn('station_manager', { tables: openReview })

        const response = await save({
            held_on: '2026-11-18',
            agreements: 'Leda en övning',
            development_needs: 'Handledarutbildning',
            notes: 'Bra samtal',
        })

        expect(response.status).toBe(200)
        expect(client.writes.salary_employee_meetings).toEqual([
            expect.objectContaining({
                salary_review_id: 'r1',
                held_on: '2026-11-18',
                agreements: 'Leda en övning',
                development_needs: 'Handledarutbildning',
                notes: 'Bra samtal',
            }),
        ])
        // Att bara spara ändrar inte om samtalet är genomfört
        expect(client.writes.salary_employee_meetings[0]).not.toHaveProperty('completed_at')
    })

    it('sparar bedömningen som den är när samtalet markeras genomfört', async () => {
        const client = signedIn('station_manager', {
            tables: {
                ...openReview,
                salary_criteria_assessments: {
                    data: [
                        { sub_criterion_key: '1a', rating: 'bra' },
                        { sub_criterion_key: '3c', rating: 'mycket_bra' },
                    ],
                },
                particularly_skilled_assessments: { data: [{ criterion_key: 'ps1', is_met: true }] },
            },
        })

        expect((await save({ agreements: 'x', completed: true })).status).toBe(200)
        expect(client.writes.salary_employee_meetings).toEqual([
            expect.objectContaining({
                completed_at: '2026-11-20T09:00:00.000Z',
                completed_by: 'u1',
                assessment_snapshot: {
                    criteria: { '1a': 'bra', '3c': 'mycket_bra' },
                    particularly_skilled: { ps1: true },
                },
            }),
        ])
    })

    it('öppnar ett genomfört samtal igen och glömmer den sparade bedömningen', async () => {
        const client = signedIn('station_manager', { tables: openReview })

        await save({ completed: false })

        expect(client.writes.salary_employee_meetings).toEqual([
            expect.objectContaining({ completed_at: null, completed_by: null, assessment_snapshot: null }),
        ])
    })

    it('svarar 409 och sparar ingenting i en stängd löneöversyn', async () => {
        const client = signedIn('station_manager', {
            tables: { salary_reviews: { data: { id: 'r1', cycle: { year: 2025, status: 'completed' } } } },
        })

        expect((await save({ agreements: 'x', completed: true })).status).toBe(409)
        expect(client.writes.salary_employee_meetings).toBeUndefined()
    })

    it('hämtar medarbetarsamtalet för lönesättningen', async () => {
        signedIn('station_manager', { tables: openReview })

        const response = await GET(new Request('http://portal.test'), ctx)

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ meeting: { id: 'm1' } })
    })
})
