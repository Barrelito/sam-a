// API Route: GET/PUT /api/salary-review/reviews/[id]/particularly-skilled
// Hanterar bedömningar av särskild yrkesskicklighet

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: reviewId } = await params

        // Hämta alla bedömningar för denna review
        const { data: assessments, error } = await supabase
            .from('particularly_skilled_assessments')
            .select('*')
            .eq('salary_review_id', reviewId)
            .order('criterion_key', { ascending: true })

        if (error) {
            console.error('Error fetching assessments:', error)
            return NextResponse.json(
                { error: 'Failed to fetch assessments' },
                { status: 500 }
            )
        }

        return NextResponse.json({ assessments: assessments || [] })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: reviewId } = await params
        const body = await request.json()
        const { assessments } = body

        if (!Array.isArray(assessments)) {
            return NextResponse.json(
                { error: 'Assessments must be an array' },
                { status: 400 }
            )
        }

        // Upsert alla bedömningar (insert or update)
        const upsertPromises = assessments.map(assessment =>
            supabase
                .from('particularly_skilled_assessments')
                .upsert({
                    salary_review_id: reviewId,
                    criterion_key: assessment.criterion_key,
                    is_met: assessment.is_met,
                    evidence: assessment.evidence || null,
                    notes: assessment.notes || null,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'salary_review_id,criterion_key'
                })
        )

        const results = await Promise.all(upsertPromises)

        // Kontrollera om något gick fel
        const errors = results.filter(r => r.error)
        if (errors.length > 0) {
            console.error('Errors upserting assessments:', errors)
            return NextResponse.json(
                { error: 'Failed to save some assessments' },
                { status: 500 }
            )
        }

        // Beräkna om medarbetaren är särskilt yrkesskicklig
        // (kan vara mer komplext beroende på regler)
        const metCount = assessments.filter(a => a.is_met).length
        const totalCount = assessments.length
        const isParticularlySkilled = metCount >= (totalCount * 0.8) // 80% kriterier måste vara uppfyllda

        // Uppdatera review med bedömningen
        await supabase
            .from('salary_reviews')
            .update({
                is_particularly_skilled: isParticularlySkilled,
                updated_at: new Date().toISOString()
            })
            .eq('id', reviewId)

        return NextResponse.json({
            success: true,
            is_particularly_skilled: isParticularlySkilled,
            met_count: metCount,
            total_count: totalCount
        })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
