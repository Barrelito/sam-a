// Bedömning av lönekriterier - Server Component
// /salary-review/employees/[id]/criteria

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { SALARY_CRITERIA } from '@/lib/salary-review/salary-criteria'
import SalaryCriteriaAssessmentClient from '@/components/salary-review/SalaryCriteriaAssessmentClient'

export default async function SalaryCriteriaPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { id: employeeId } = await params

    // Hämta medarbetare
    const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single()

    if (employeeError || !employee) {
        notFound()
    }

    // Hämta eller skapa review
    const { data: activeCycle } = await supabase
        .from('salary_review_cycles')
        .select('*')
        .eq('status', 'active')
        .single()

    if (!activeCycle) {
        return (
            <div className="container mx-auto py-8">
                <p className="text-muted-foreground">
                    Det finns ingen aktiv löneöversynscykel.
                </p>
            </div>
        )
    }

    // Hämta eller skapa review
    let review = null
    const { data: existingReview } = await supabase
        .from('salary_reviews')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('cycle_id', activeCycle.id)
        .single()

    if (existingReview) {
        review = existingReview
    } else {
        const { data: newReview } = await supabase
            .from('salary_reviews')
            .insert({
                cycle_id: activeCycle.id,
                employee_id: employeeId,
                manager_id: user.id,
                status: 'in_progress'
            })
            .select()
            .single()

        review = newReview
    }

    if (!review) {
        return (
            <div className="container mx-auto py-8">
                <p className="text-muted-foreground">
                    Kunde inte skapa eller hämta löneöversyn.
                </p>
            </div>
        )
    }

    return (
        <SalaryCriteriaAssessmentClient
            employee={employee}
            review={review}
            criteria={SALARY_CRITERIA}
        />
    )
}
