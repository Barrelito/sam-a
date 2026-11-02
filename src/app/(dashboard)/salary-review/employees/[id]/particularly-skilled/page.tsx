// Bedömning av särskild yrkesskicklighet - Server Component
// /salary-review/employees/[id]/particularly-skilled

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getCriteriaForEmployeeCategory } from '@/lib/salary-review/particularly-skilled-criteria'
import ParticularlySkillfulAssessmentClient from '@/components/salary-review/ParticularlySkillfulAssessmentClient'
import { getSelectedCycle } from '@/lib/salary-review/cycles-server'
import ClosedCycleGuard from '@/components/salary-review/ClosedCycleGuard'
import { getAssessmentComparison, getOrCreateReview } from '@/lib/salary-review/reviews-server'
import MissingLonesattning from '@/components/salary-review/MissingLonesattning'

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
            <ParticularlySkillfulAssessmentClient
                employee={employee}
                review={review}
                criteria={criteria}
                previous={previous ? { year: previous.year, met: previous.particularly_skilled } : null}
                atEmployeeMeeting={atEmployeeMeeting?.particularly_skilled ?? null}
            />
        </ClosedCycleGuard>
    )
}
