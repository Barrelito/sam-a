// Bedömning av lönekriterier - Server Component
// /salary-review/employees/[id]/criteria

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { SALARY_CRITERIA } from '@/lib/salary-review/salary-criteria'
import SalaryCriteriaAssessmentClient from '@/components/salary-review/SalaryCriteriaAssessmentClient'
import { getSelectedCycle } from '@/lib/salary-review/cycles-server'
import ClosedCycleGuard from '@/components/salary-review/ClosedCycleGuard'
import { getAssessmentComparison, getOrCreateReview } from '@/lib/salary-review/reviews-server'
import MissingLonesattning from '@/components/salary-review/MissingLonesattning'

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
    const { cycle: selectedCycle } = await getSelectedCycle(supabase)

    if (!selectedCycle) {
        return (
            <div className="container mx-auto py-8">
                <p className="text-muted-foreground">
                    Det finns ingen öppen löneöversyn.
                </p>
            </div>
        )
    }

    // Hämta eller skapa lönesättningen (aldrig i en stängd löneöversyn)
    const review = await getOrCreateReview(supabase, selectedCycle, employeeId, user.id, {
        initialStatus: 'in_progress',
    })

    if (!review) {
        return <MissingLonesattning cycle={selectedCycle} />
    }

    // Fjolårets bedömning och bedömningen vid medarbetarsamtalet, för jämförelse
    const { previous, atEmployeeMeeting } = await getAssessmentComparison(supabase, employeeId, selectedCycle, review.id)

    return (
        <ClosedCycleGuard cycle={selectedCycle} backHref={`/salary-review/employees/${employeeId}`}>
            <SalaryCriteriaAssessmentClient
                employee={employee}
                review={review}
                criteria={SALARY_CRITERIA}
                previous={previous ? { year: previous.year, ratings: previous.criteria, evidence: previous.criteria_evidence } : null}
                atEmployeeMeeting={atEmployeeMeeting?.criteria ?? null}
            />
        </ClosedCycleGuard>
    )
}
