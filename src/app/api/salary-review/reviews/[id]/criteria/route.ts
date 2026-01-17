// API Route: GET/PUT /api/salary-review/reviews/[id]/criteria
// Hanterar bedömningar av lönekriterier

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

        // Hämta alla kriteriebed ömningar för denna review
        const { data: assessments, error } = await supabase
            .from('salary_criteria_assessments')
            .select('*')
            .eq('salary_review_id', reviewId)
            .order('sub_criterion_key', { ascending: true })

        if (error) {
            console.error('Error fetching criteria assessments:', error)
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


        // Validera att alla required fields finns (evidence är nu frivilligt)
        for (const assessment of assessments) {
            if (!assessment.sub_criterion_key || !assessment.rating) {
                return NextResponse.json(
                    { error: 'Missing required fields: sub_criterion_key, rating' },
                    { status: 400 }
                )
            }
        }

        // Radera alla gamla bedömningar först
        const { error: deleteError } = await supabase
            .from('salary_criteria_assessments')
            .delete()
            .eq('salary_review_id', reviewId)

        if (deleteError) {
            console.error('Error deleting old assessments:', deleteError)
            return NextResponse.json(
                { error: 'Failed to clear old assessments' },
                { status: 500 }
            )
        }

        // Skapa nya bedömningar
        const newAssessments = assessments.map(assessment => ({
            salary_review_id: reviewId,
            criterion_key: assessment.criterion_key,
            sub_criterion_key: assessment.sub_criterion_key,
            rating: assessment.rating,
            evidence: assessment.evidence || null,
            notes: assessment.notes || null
        }))

        const { error: insertError } = await supabase
            .from('salary_criteria_assessments')
            .insert(newAssessments)

        if (insertError) {
            console.error('Error inserting new assessments:', JSON.stringify(insertError, null, 2))
            console.error('Attempted to insert:', JSON.stringify(newAssessments, null, 2))
            return NextResponse.json(
                { error: `Failed to save assessments: ${insertError.message}` },
                { status: 500 }
            )
        }

        // Beräkna genomsnittlig rating (kan användas för löneförslag)
        const ratingValues = {
            'behover_utvecklas': 1,
            'bra': 2,
            'mycket_bra': 3,
            'utmarkt': 4
        }

        const avgRating = assessments.reduce((sum, a) => sum + ratingValues[a.rating as keyof typeof ratingValues], 0) / assessments.length

        return NextResponse.json({
            success: true,
            assessed_count: assessments.length,
            average_rating: avgRating
        })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
