// API Route: POST /api/salary-review/cycles/[id]/close
// Stänger en löneöversyn. Stängningen påverkar alla stationer och är därför
// förbehållen admin och VO-chef (ADR 0004). En stängd löneöversyn går att
// välja i årsvalet men inte ändra.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/guard'
import { logAudit } from '@/lib/audit'
import { CLOSE_CYCLE_ROLES, isOpenCycle } from '@/lib/salary-review/lonesattning'

// Stängningen gäller alla stationer, så underlaget för bekräftelsen räknas
// över hela organisationen – inte bara det anroparen ser via RLS. Därför
// tjänstenyckeln, men först efter att rollen är styrkt.
function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
        throw new Error('Missing Supabase admin credentials')
    }

    return createServiceClient(url, serviceKey)
}

// GET: hur många medarbetare som saknar klar lönesättning i löneöversynen.
// Medarbetare som aldrig öppnats har ingen lönesättning och räknas som ej klara.
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const guard = await requireRole(CLOSE_CYCLE_ROLES)
        if (!guard.ok) return guard.response
        const { id } = await params

        const admin = createAdminClient()
        const { data: cycle } = await admin
            .from('salary_review_cycles')
            .select('id, year')
            .eq('id', id)
            .maybeSingle()

        if (!cycle) {
            return NextResponse.json({ error: 'Löneöversynen finns inte' }, { status: 404 })
        }

        const [{ count: total }, { count: completed }] = await Promise.all([
            admin.from('employees').select('id', { count: 'exact', head: true }),
            admin
                .from('salary_reviews')
                .select('id', { count: 'exact', head: true })
                .eq('cycle_id', id)
                .eq('status', 'completed'),
        ])

        const all = total ?? 0
        return NextResponse.json({
            year: cycle.year,
            total: all,
            unfinished: Math.max(0, all - (completed ?? 0)),
        })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

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

        await logAudit(supabase, {
            user_id: userId,
            action: 'CLOSE_SALARY_REVIEW_CYCLE',
            resource_id: cycle.id,
            resource_type: 'salary_review_cycle',
            details: { year: cycle.year }
        })

        return NextResponse.json({ cycle: { ...cycle, status: 'completed' } })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
