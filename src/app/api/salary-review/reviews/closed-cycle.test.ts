import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signIns } from '@/test/route-harness'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

const { createClient } = await import('@/lib/supabase/server')
const review = await import('./[id]/route')
const criteria = await import('./[id]/criteria/route')
const skilled = await import('./[id]/particularly-skilled/route')
const preparation = await import('./[id]/meeting-preparation/route')

const { signedIn } = signIns(vi.mocked(createClient))

const put = (handler: typeof review.PUT, body: unknown) =>
    handler(
        new Request('http://portal.test/api/salary-review/reviews/r1', {
            method: 'PUT',
            body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ id: 'r1' }) }
    )

const reviewIn = (status: 'active' | 'completed') => ({
    salary_reviews: {
        data: { id: 'r1', manager_id: 'u1', status: 'in_progress', cycle: { year: 2025, status } },
    },
})

const writers = [
    ['lönesättningen', review.PUT, { status: 'in_progress', meeting_notes: 'x' }],
    ['kriteriebedömningen', criteria.PUT, { assessments: [] }],
    ['särskild yrkesskicklighet', skilled.PUT, { assessments: [] }],
    ['förberedelsen av lönesamtalet', preparation.PUT, { previous_agreements: 'x' }],
] as const

describe('lönesättningar i en stängd löneöversyn går inte att ändra', () => {
    beforeEach(() => vi.clearAllMocks())

    it.each(writers)('nekar ändring av %s med 409', async (_name, handler, body) => {
        const client = signedIn('station_manager', { tables: reviewIn('completed') })

        const response = await put(handler, body)

        expect(response.status).toBe(409)
        expect(await response.json()).toEqual({ error: 'Löneöversyn 2025 är stängd och kan inte ändras' })
        expect(client.writes).toEqual({})
        expect(client.updates).toEqual({})
    })

    it.each(writers)('släpper igenom ändring av %s i en öppen löneöversyn', async (_name, handler, body) => {
        signedIn('station_manager', { tables: reviewIn('active') })

        expect((await put(handler, body)).status).not.toBe(409)
    })
})
