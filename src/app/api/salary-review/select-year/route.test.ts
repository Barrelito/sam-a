import { describe, expect, it } from 'vitest'

const { GET } = await import('./route')

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
