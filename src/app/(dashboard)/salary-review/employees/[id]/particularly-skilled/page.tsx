// Bedömning av särskild yrkesskicklighet - Server Component
// /salary-review/employees/[id]/particularly-skilled

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getCriteriaForEmployeeCategory } from '@/lib/salary-review/particularly-skilled-criteria'
import ParticularlySkillfulAssessmentClient from '@/components/salary-review/ParticularlySkillfulAssessmentClient'

export default async function ParticularlySkillfulPage({ params }: { params: Promise<{ id: string }> }) {
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

    // Kontrollera att kategorin har särskild yrkesskicklighet
    const criteria = getCriteriaForEmployeeCategory(employee.category)

    if (!criteria) {
        return (
            <div className="container mx-auto py-8">
                <p className="text-muted-foreground">
                    {employee.category} har inte bedömning av särskild yrkesskicklighet.
                </p>
            </div>
        )
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
        <ParticularlySkillfulAssessmentClient
            employee={employee}
            review={review}
            criteria={criteria}
        />
    )
}
