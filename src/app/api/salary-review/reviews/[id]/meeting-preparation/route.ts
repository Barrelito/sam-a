// API Route: Meeting Preparation for Salary Review
// GET /api/salary-review/reviews/[id]/meeting-preparation - Hämta förberedelser
// PUT /api/salary-review/reviews/[id]/meeting-preparation - Spara/uppdatera förberedelser

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Hämta meeting preparation
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { id: reviewId } = await params

        // Verifiera autentisering
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Verifiera att användaren äger denna review
        const { data: review, error: reviewError } = await supabase
            .from('salary_reviews')
            .select('manager_id')
            .eq('id', reviewId)
            .single()

        if (reviewError || !review) {
            return NextResponse.json(
                { error: 'Review not found' },
                { status: 404 }
            )
        }

        if (review.manager_id !== user.id) {
            return NextResponse.json(
                { error: 'Forbidden - you do not own this review' },
                { status: 403 }
            )
        }

        // Hämta meeting preparation
        const { data: preparation, error } = await supabase
            .from('salary_meeting_preparations')
            .select('*')
            .eq('salary_review_id', reviewId)
            .maybeSingle()

        if (error) {
            console.error('Error fetching meeting preparation:', error)
            return NextResponse.json(
                { error: 'Failed to fetch meeting preparation' },
                { status: 500 }
            )
        }

        return NextResponse.json({ preparation })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT - Spara/uppdatera meeting preparation
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { id: reviewId } = await params

        // Verifiera autentisering
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Verifiera att användaren äger denna review
        const { data: review, error: reviewError } = await supabase
            .from('salary_reviews')
            .select('manager_id')
            .eq('id', reviewId)
            .single()

        if (reviewError || !review) {
            return NextResponse.json(
                { error: 'Review not found' },
                { status: 404 }
            )
        }

        if (review.manager_id !== user.id) {
            return NextResponse.json(
                { error: 'Forbidden - you do not own this review' },
                { status: 403 }
            )
        }

        // Parse request body
        const body = await request.json()
        const {
            previous_agreements,
            goals_achieved,
            contribution_summary,
            salary_statistics,
            development_needs,
            strengths_summary,
            ai_generated_summary
        } = body

        // Upsert meeting preparation
        const { data: preparation, error } = await supabase
            .from('salary_meeting_preparations')
            .upsert({
                salary_review_id: reviewId,
                previous_agreements,
                goals_achieved,
                contribution_summary,
                salary_statistics,
                development_needs,
                strengths_summary,
                ai_generated_summary
            }, {
                onConflict: 'salary_review_id'
            })
            .select()
            .single()

        if (error) {
            console.error('Error upserting meeting preparation:', error)
            return NextResponse.json(
                { error: 'Failed to save meeting preparation' },
                { status: 500 }
            )
        }

        // Uppdatera review status till in_progress om den är not_started
        if (review.manager_id === user.id) {
            await supabase
                .from('salary_reviews')
                .update({ status: 'in_progress' })
                .eq('id', reviewId)
                .eq('status', 'not_started')
        }

        return NextResponse.json({ preparation })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
