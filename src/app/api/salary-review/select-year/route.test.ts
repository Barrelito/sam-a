import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { signIns } from '@/test/route-harness'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

const { createClient } = await import('@/lib/supabase/server')
const { GET } = await import('./route')

const { signedIn } = signIns(vi.mocked(createClient))

const call = (query: string) =>
    GET(new Request(`http://portal.test/api/salary-review/select-year?${query}`))

describe('/api/salary-review/select-year', () => {
    it('sparar valt år och skickar chefen tillbaka till sidan i löneöversynen', async () => {
        const response = await call('year=2026&next=/salary-review/employees')

        expect(response.status).toBe(307)
        expect(response.headers.get('location')).toBe('http://portal.test/salary-review/employees')
        expect(response.headers.get('set-cookie')).toMatch(/loneoversyn_ar=2026/)
    })

    it('går till löneöversynens översikt när inget mål anges', async () => {
        const response = await call('year=2027')

        expect(response.headers.get('location')).toBe('http://portal.test/salary-review')
    })

    it('skickar aldrig vidare utanför löneöversynen', async () => {
        for (const next of ['https://evil.test/x', '//evil.test', '/admin/users', '/salary-reviewer']) {
            const response = await call(`year=2027&next=${encodeURIComponent(next)}`)
            expect(response.headers.get('location')).toBe('http://portal.test/salary-review')
        }
    })

    it('rensar valet när året är ogiltigt, så att nyaste öppna gäller', async () => {
        const response = await call('year=abc&next=/salary-review')

        expect(response.headers.get('set-cookie')).toMatch(/loneoversyn_ar=;/)
    })
})

describe('/api/salary-review/select-year?year=next: årshjulets länk till nästa års löneöversyn', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-08-15T09:00:00Z'))
    })
    afterEach(() => vi.useRealTimers())

    it('väljer nästa år och går till medarbetarlistan när det är startat', async () => {
        signedIn('station_manager', { tables: { salary_review_cycles: { data: { id: 'c27' } } } })

        const response = await call('year=next&next=/salary-review/employees')

        expect(response.headers.get('location')).toBe('http://portal.test/salary-review/employees')
        expect(response.headers.get('set-cookie')).toMatch(/loneoversyn_ar=2027/)
    })

    it('går till översikten, där nästa år kan startas, när det inte finns än', async () => {
        signedIn('station_manager', { tables: { salary_review_cycles: { data: null } } })

        const response = await call('year=next&next=/salary-review/employees')

        expect(response.headers.get('location')).toBe('http://portal.test/salary-review')
        expect(response.headers.get('set-cookie')).toBeNull()
    })
})
