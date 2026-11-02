import { describe, expect, it } from 'vitest'
import { fakeRequestClient, fakeServiceClient } from './fake-supabase'

describe('fakeRequestClient med svar per tabell', () => {
    it('låter två tabeller ge olika svar i samma anrop', async () => {
        const client = fakeRequestClient({
            user: { id: 'u1' },
            role: 'station_manager',
            tables: {
                salary_review_cycles: { data: [{ id: 'c26', year: 2026 }] },
                employees: { data: null, error: { message: 'nej' } },
            },
        })

        const cycles = await client.from('salary_review_cycles').select('*').order('year')
        const employee = await client.from('employees').select('*').eq('id', 'e1').single()

        expect(cycles).toEqual({ data: [{ id: 'c26', year: 2026 }], error: null })
        expect(employee).toEqual({ data: null, error: { message: 'nej' } })
    })

    it('ger dagens generiska rad för tabeller som inte nämns', async () => {
        const client = fakeRequestClient({
            user: { id: 'u1' },
            role: 'admin',
            tables: { employees: { data: [] } },
        })

        expect(await client.from('stations').select('*').maybeSingle()).toEqual({
            data: { id: 'row-1' },
            error: null,
        })
    })

    it('ger svaren i tur och ordning när en tabell får en lista av svar', async () => {
        const client = fakeRequestClient({
            user: { id: 'u1' },
            role: 'admin',
            tables: {
                salary_review_cycles: [
                    { data: null },
                    { data: { id: 'c27', year: 2027 } },
                ],
            },
        })

        const first = await client.from('salary_review_cycles').select('id').eq('year', 2027).maybeSingle()
        const second = await client.from('salary_review_cycles').insert({ year: 2027 }).select().single()
        const third = await client.from('salary_review_cycles').select('id')

        expect(first.data).toBeNull()
        expect(second.data).toEqual({ id: 'c27', year: 2027 })
        // Det sista svaret upprepas när listan är slut
        expect(third.data).toEqual({ id: 'c27', year: 2027 })
    })

    it('låter rollen styras som förut även när profiles inte anges', async () => {
        const client = fakeRequestClient({
            user: { id: 'u1' },
            role: 'vo_chief',
            tables: { employees: { data: [] } },
        })

        expect((await client.from('profiles').select('role').single()).data).toEqual({ role: 'vo_chief' })
    })
})

describe('fakeServiceClient med svar per tabell', () => {
    it('svarar per tabell och spelar fortfarande in skrivningar', async () => {
        const client = fakeServiceClient({ tables: { audit_logs: { data: null } } })

        const result = await client.from('audit_logs').insert({ action: 'x' })

        expect(result).toEqual({ data: null, error: null })
        expect(client.writes.audit_logs).toEqual([{ action: 'x' }])
    })
})
