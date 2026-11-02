import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/guard'
import { getSelectedCycle } from '@/lib/salary-review/cycles-server'
import { nextCycleYear, START_CYCLE_ROLES } from '@/lib/salary-review/lonesattning'

// API Route: GET /api/salary-review/cycles
// Alla löneöversyner, nyaste först, och den som är vald (årsvalet, annars
// nyaste öppna). Klientsidor hämtar vald löneöversyn härifrån eftersom
// årsvalet ligger i en cookie som bara servern läser.

export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { cycle: selected, cycles } = await getSelectedCycle(supabase)
        return NextResponse.json({ cycles, selected })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// API Route: POST /api/salary-review/cycles
// Startar nästa års löneöversyn. Den gäller hela organisationen och får
// startas av stationschef, områdeschef, VO-chef och admin (ADR 0004).
// Bara nästa år, och bara om det inte redan finns.

export async function POST(request: Request) {
    try {
        const guard = await requireRole(START_CYCLE_ROLES)
        if (!guard.ok) return guard.response
        const { supabase, userId } = guard

        const body = await request.json().catch(() => ({}))
        const year = nextCycleYear(new Date())

        if (body.year !== undefined && Number(body.year) !== year) {
            return NextResponse.json(
                { error: `Bara nästa års löneöversyn (${year}) kan startas` },
                { status: 400 }
            )
        }

        const { data: existing } = await supabase
            .from('salary_review_cycles')
            .select('id')
            .eq('year', year)
            .maybeSingle()

        if (existing) {
            return NextResponse.json(
                { error: `Löneöversyn ${year} är redan startad` },
                { status: 409 }
            )
        }

        const { data: cycle, error } = await supabase
            .from('salary_review_cycles')
            .insert({
                year,
                description: `Löneöversyn ${year}`,
                status: 'active',
                start_date: `${year}-01-01`,
                end_date: `${year}-12-31`,
                created_by: userId
            })
            .select()
            .single()

        if (error) {
            // Någon annan hann starta samma år (unik per år)
            if (error.code === '23505') {
                return NextResponse.json(
                    { error: `Löneöversyn ${year} är redan startad` },
                    { status: 409 }
                )
            }
            console.error('Error creating cycle:', error)
            return NextResponse.json(
                { error: 'Failed to create cycle' },
                { status: 500 }
            )
        }

        try {
            await supabase.from('audit_logs').insert({
                user_id: userId,
                action: 'START_SALARY_REVIEW_CYCLE',
                resource_id: cycle.id,
                resource_type: 'salary_review_cycle',
                details: { year }
            })
        } catch (e) {
            console.warn('Audit log failed', e)
        }

        return NextResponse.json({ cycle }, { status: 201 })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
