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

        // 1. Hämta review för att få employee_id
        const { data: reviewInfo, error: reviewError } = await supabase
            .from('salary_reviews')
            .select('employee_id')
            .eq('id', reviewId)
            .single()

        if (reviewError || !reviewInfo) {
            return NextResponse.json({ error: 'Review not found' }, { status: 404 })
        }

        // 2. Hämta employee för att få category
        const { data: employee, error: employeeError } = await supabase
            .from('employees')
            .select('category')
            .eq('id', reviewInfo.employee_id)
            .single()

        if (employeeError || !employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
        }

        // 3. Upsert alla bedömningar
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
        const errors = results.filter(r => r.error)

        if (errors.length > 0) {
            console.error('Errors upserting assessments:', errors)
            // Vi fortsätter ändå för att göra bästa möjliga beräkning
        }

        // 4. Hämta alla aktuella bedömningar från databasen för att vara säker
        const { data: allAssessments } = await supabase
            .from('particularly_skilled_assessments')
            .select('*')
            .eq('salary_review_id', reviewId)

        // 5. Beräkna poäng baserat på GILTIGA kriterier
        const { getAllSubCriteriaIds } = await import('@/lib/salary-review/particularly-skilled-criteria')
        const validIds = getAllSubCriteriaIds(employee.category as any)
        const totalCount = validIds.length

        // Filtrera bedömningar så att vi bara räknar de som finns i kriterielistan
        const validAssessments = (allAssessments || []).filter(a => validIds.includes(a.criterion_key))
        const metCount = validAssessments.filter(a => a.is_met).length

        const isParticularlySkilled = totalCount > 0 && metCount >= (totalCount * 0.8)

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
