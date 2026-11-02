// Bedömning av lönekriterier - Server Component
// /salary-review/employees/[id]/criteria

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { SALARY_CRITERIA } from '@/lib/salary-review/salary-criteria'
import SalaryCriteriaAssessmentClient from '@/components/salary-review/SalaryCriteriaAssessmentClient'
import { getSelectedCycle } from '@/lib/salary-review/cycles-server'
import { isOpenCycle } from '@/lib/salary-review/lonesattning'
import ClosedCycleGuard from '@/components/salary-review/ClosedCycleGuard'
import { getEmployeeMeeting, getPreviousLonesattning } from '@/lib/salary-review/reviews-server'

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
    const { cycle: activeCycle } = await getSelectedCycle(supabase)

    if (!activeCycle) {
        return (
            <div className="container mx-auto py-8">
                <p className="text-muted-foreground">
                    Det finns ingen öppen löneöversyn.
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
    } else if (isOpenCycle(activeCycle)) {
        // I en stängd löneöversyn skapas inga nya lönesättningar
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
                    {isOpenCycle(activeCycle)
                        ? 'Kunde inte skapa eller hämta lönesättningen.'
                        : `Medarbetaren har ingen lönesättning i löneöversyn ${activeCycle.year}.`}
                </p>
            </div>
        )
    }

    // Fjolårets bedömning och bedömningen vid medarbetarsamtalet, för jämförelse
    const [previous, meeting] = await Promise.all([
        getPreviousLonesattning(supabase, employeeId, activeCycle.year),
        getEmployeeMeeting(supabase, review.id),
    ])

    return (
        <ClosedCycleGuard cycle={activeCycle} backHref={`/salary-review/employees/${employeeId}`}>
            <SalaryCriteriaAssessmentClient
                employee={employee}
                review={review}
                criteria={SALARY_CRITERIA}
                previous={previous ? { year: previous.year, ratings: previous.criteria } : null}
                atEmployeeMeeting={meeting?.assessment_snapshot?.criteria ?? null}
            />
        </ClosedCycleGuard>
    )
}
