import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fakeRequestClient } from '@/test/fake-supabase'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

const { createClient } = await import('@/lib/supabase/server')
const { requireRole } = await import('./guard')

const mockedCreateClient = vi.mocked(createClient)

describe('requireRole', () => {
    beforeEach(() => vi.clearAllMocks())

    it('nekar den som inte är inloggad', async () => {
        mockedCreateClient.mockResolvedValue(
            fakeRequestClient({ user: null }) as never
        )

        const result = await requireRole(['admin'])

        expect(result.ok).toBe(false)
        if (result.ok) throw new Error('unreachable')
        expect(result.response.status).toBe(401)
    })

    it('nekar den vars roll inte räcker', async () => {
        mockedCreateClient.mockResolvedValue(
            fakeRequestClient({ user: { id: 'u1' }, role: 'station_manager' }) as never
        )

        const result = await requireRole(['admin'])

        expect(result.ok).toBe(false)
        if (result.ok) throw new Error('unreachable')
        expect(result.response.status).toBe(403)
    })

    it('nekar den som är inloggad men saknar profil', async () => {
        mockedCreateClient.mockResolvedValue(
            fakeRequestClient({ user: { id: 'u1' }, role: null }) as never
        )

        const result = await requireRole(['admin'])

        expect(result.ok).toBe(false)
        if (result.ok) throw new Error('unreachable')
        expect(result.response.status).toBe(403)
    })

    it('skiljer ett misslyckat rolluppslag från ett nekande', async () => {
        mockedCreateClient.mockResolvedValue(
            fakeRequestClient({ user: { id: 'u1' }, roleLookupFails: true }) as never
        )

        const result = await requireRole(['admin'])

        expect(result.ok).toBe(false)
        if (result.ok) throw new Error('unreachable')
        expect(result.response.status).toBe(500)
    })

    it('släpper igenom den vars roll är tillåten, och lämnar ut vem det är', async () => {
        mockedCreateClient.mockResolvedValue(
            fakeRequestClient({ user: { id: 'u1' }, role: 'admin' }) as never
        )

        const result = await requireRole(['admin'])

        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error('unreachable')
        expect(result.userId).toBe('u1')
        expect(result.role).toBe('admin')
    })

    it('släpper igenom vilken som helst av flera tillåtna roller', async () => {
        mockedCreateClient.mockResolvedValue(
            fakeRequestClient({ user: { id: 'u1' }, role: 'vo_chief' }) as never
        )

        const result = await requireRole(['admin', 'vo_chief'])

        expect(result.ok).toBe(true)
    })
})
