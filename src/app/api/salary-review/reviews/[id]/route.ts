// API Route: GET /api/salary-review/reviews/[id]
// Hämtar en specifik salary review

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()

        // Verifiera autentisering
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { id: reviewId } = await params

        // Hämta review med relaterad data (RLS hanterar behörigheter)
        const { data: review, error } = await supabase
            .from('salary_reviews')
            .select(`
        *,
        employee:employees (
          *,
          station:stations (
            id,
            name,
            vo_id
          )
        ),
        cycle:salary_review_cycles (*),
        particularly_skilled_assessments (*),
        salary_criteria_assessments (*),
        meeting_preparation:salary_meeting_preparations (*)
      `)
            .eq('id', reviewId)
            .single()

        if (error) {
            console.error('Error fetching review:', error)

            if (error.code === 'PGRST116') {
                return NextResponse.json(
                    { error: 'Review not found' },
                    { status: 404 }
                )
            }

            return NextResponse.json(
                { error: 'Failed to fetch review' },
                { status: 500 }
            )
        }

        return NextResponse.json({ review })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// API Route: PUT /api/salary-review/reviews/[id]
// Uppdaterar en salary review

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()

        // Verifiera autentisering
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { id: reviewId } = await params
        const body = await request.json()

        const {
            status,
            is_particularly_skilled,
            proposed_salary,
            final_salary,
            meeting_date,
            meeting_notes
        } = body

        // Uppdatera review (RLS hanterar behörigheter)
        const updateData: any = {
            status,
            is_particularly_skilled,
            proposed_salary,
            final_salary,
            meeting_date,
            meeting_notes,
            updated_at: new Date().toISOString()
        }

        // Sätt completed_at om status är 'completed'
        if (status === 'completed') {
            updateData.completed_at = new Date().toISOString()
        }

        const { data: review, error } = await supabase
            .from('salary_reviews')
            .update(updateData)
            .eq('id', reviewId)
            .select()
            .single()

        if (error) {
            console.error('Error updating review:', error)
            return NextResponse.json(
                { error: 'Failed to update review' },
                { status: 500 }
            )
        }

        return NextResponse.json({ review })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
