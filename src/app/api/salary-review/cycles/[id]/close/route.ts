// API Route: POST /api/salary-review/cycles/[id]/close
// Stänger en löneöversyn. Stängningen påverkar alla stationer och är därför
// förbehållen admin och VO-chef (ADR 0004). En stängd löneöversyn går att
// välja i årsvalet men inte ändra.

import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/guard'
import { CLOSE_CYCLE_ROLES, isOpenCycle } from '@/lib/salary-review/lonesattning'

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const guard = await requireRole(CLOSE_CYCLE_ROLES)
        if (!guard.ok) return guard.response
        const { supabase, userId } = guard
        const { id } = await params

        const { data: cycle } = await supabase
            .from('salary_review_cycles')
            .select('id, year, status')
            .eq('id', id)
            .maybeSingle()

        if (!cycle) {
            return NextResponse.json({ error: 'Löneöversynen finns inte' }, { status: 404 })
        }

        if (!isOpenCycle(cycle)) {
            return NextResponse.json(
                { error: `Löneöversyn ${cycle.year} är redan stängd` },
                { status: 409 }
            )
        }

        const { error } = await supabase
            .from('salary_review_cycles')
            .update({ status: 'completed' })
            .eq('id', id)

        if (error) {
            console.error('Error closing cycle:', error)
            return NextResponse.json({ error: 'Kunde inte stänga löneöversynen' }, { status: 500 })
        }

        try {
            await supabase.from('audit_logs').insert({
                user_id: userId,
                action: 'CLOSE_SALARY_REVIEW_CYCLE',
                resource_id: cycle.id,
                resource_type: 'salary_review_cycle',
                details: { year: cycle.year }
            })
        } catch (e) {
            console.warn('Audit log failed', e)
        }

        return NextResponse.json({ cycle: { ...cycle, status: 'completed' } })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
