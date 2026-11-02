// API Route: /api/salary-review/reviews/[id]/employee-meeting
// Medarbetarsamtalet är lönesättningens första samtal (se CONTEXT.md).
// GET hämtar det, PUT sparar det och kan markera det genomfört eller öppna
// det igen. Bedömningen görs i de vanliga kriterie- och
// yrkesskicklighetsflödena; när samtalet markeras genomfört sparas den som den
// var då, så att lönesamtalet kan visa vad som ändrats.
//
// Åtkomst följer lönesättningen via RLS: syns den inte för chefen blir det 404.

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { closedCycleResponse } from '@/lib/salary-review/review-lock'
import { assessmentSnapshot } from '@/lib/salary-review/lonesattning'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: reviewId } = await params
        const { data: meeting, error } = await supabase
            .from('salary_employee_meetings')
            .select('*')
            .eq('salary_review_id', reviewId)
            .maybeSingle()

        if (error) {
            console.error('Error fetching employee meeting:', error)
            return NextResponse.json({ error: 'Kunde inte hämta medarbetarsamtalet' }, { status: 500 })
        }

        return NextResponse.json({ meeting })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(request: Request, { params }: Params) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: reviewId } = await params

        const locked = await closedCycleResponse(supabase, reviewId)
        if (locked) return locked

        const { data: review } = await supabase
            .from('salary_reviews')
            .select('id')
            .eq('id', reviewId)
            .maybeSingle()

        if (!review) {
            return NextResponse.json({ error: 'Lönesättningen hittades inte' }, { status: 404 })
        }

        const body = await request.json().catch(() => ({}))
        const record: Record<string, unknown> = { salary_review_id: reviewId }
        for (const field of ['held_on', 'agreements', 'development_needs', 'notes'] as const) {
            if (body[field] !== undefined) record[field] = body[field] === '' ? null : body[field]
        }

        if (body.completed === true) {
            const [{ data: criteria }, { data: skilled }] = await Promise.all([
                supabase
                    .from('salary_criteria_assessments')
                    .select('sub_criterion_key, rating')
                    .eq('salary_review_id', reviewId),
                supabase
                    .from('particularly_skilled_assessments')
                    .select('criterion_key, is_met')
                    .eq('salary_review_id', reviewId),
            ])
            record.completed_at = new Date().toISOString()
            record.completed_by = user.id
            record.assessment_snapshot = assessmentSnapshot(
                Array.isArray(criteria) ? criteria : [],
                Array.isArray(skilled) ? skilled : []
            )
        } else if (body.completed === false) {
            record.completed_at = null
            record.completed_by = null
            record.assessment_snapshot = null
        }

        const { data: meeting, error } = await supabase
            .from('salary_employee_meetings')
            .upsert(record, { onConflict: 'salary_review_id' })
            .select()
            .single()

        if (error) {
            console.error('Error saving employee meeting:', error)
            return NextResponse.json({ error: 'Kunde inte spara medarbetarsamtalet' }, { status: 500 })
        }

        // Lönesättningen har kommit igång
        await supabase
            .from('salary_reviews')
            .update({ status: 'in_progress' })
            .eq('id', reviewId)
            .eq('status', 'not_started')

        return NextResponse.json({ meeting })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
