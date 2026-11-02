import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSelectedCycle } from '@/lib/salary-review/cycles-server'
import { getEmployeeMeeting } from '@/lib/salary-review/reviews-server'
import { describeChangesSinceMeeting } from '@/lib/salary-review/assessment-labels'
import EmployeeAssessmentPresentation from '@/components/salary-review/EmployeeAssessmentPresentation'

async function getEmployeeMeetingData(employeeId: string) {
    const supabase = await createClient()

    try {
        // Fetch employee data with category
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('id, first_name, last_name, category')
            .eq('id', employeeId)
            .single()

        if (empError || !employee) {
            console.error('Error fetching employee:', empError)
            return null
        }

        // Lönesättningen i vald löneöversyn
        const { cycle } = await getSelectedCycle(supabase)
        const { data: review, error: reviewError } = await supabase
            .from('salary_reviews')
            .select('id')
            .eq('employee_id', employeeId)
            .eq('cycle_id', cycle?.id ?? '')
            .maybeSingle()

        console.log('Review query result:', { review, reviewError, employeeId })

        if (reviewError) {
            console.error('Review error:', reviewError)
        }

        if (!review) {
            console.error('No review found for employee:', employeeId)
            // Check if user is authenticated
            const { data: { user } } = await supabase.auth.getUser()
            console.log('Current user:', user?.email)

            return { employee, criteriaAssessments: [], particularlySkillfulAssessments: [] }
        }

        console.log('Found review:', review.id)

        // Fetch criteria assessments
        const { data: criteriaAssessments, error: criteriaError } = await supabase
            .from('salary_criteria_assessments')
            .select('sub_criterion_key, rating')
            .eq('salary_review_id', review.id)

        console.log('Criteria assessments:', criteriaAssessments, criteriaError)

        // Fetch particularly skillful assessments (only for VUB and SSK)
        let particularlySkillfulAssessments: Array<{ criterion_key: string; is_met: boolean }> = []
        if (employee.category === 'VUB' || employee.category === 'SSK') {
            const { data: psAssessments } = await supabase
                .from('particularly_skilled_assessments')
                .select('criterion_key, is_met')
                .eq('salary_review_id', review.id)

            particularlySkillfulAssessments = psAssessments || []
        }

        // Ändringar sedan medarbetarsamtalet, så att medarbetaren ser dem
        const meeting = await getEmployeeMeeting(supabase, review.id)
        const changesSinceMeeting = describeChangesSinceMeeting(
            criteriaAssessments || [],
            particularlySkillfulAssessments,
            meeting?.completed_at ? meeting.assessment_snapshot : null
        )

        return {
            employee,
            criteriaAssessments: criteriaAssessments || [],
            particularlySkillfulAssessments,
            changesSinceMeeting
        }
    } catch (error) {
        console.error('Error fetching meeting data:', error)
        return null
    }
}

export default async function AssessmentViewPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const data = await getEmployeeMeetingData(id)

    if (!data || !data.employee) {
        notFound()
    }

    const { employee, criteriaAssessments, particularlySkillfulAssessments } = data
    const changesSinceMeeting = 'changesSinceMeeting' in data ? data.changesSinceMeeting : []

    // Calculate SYS stats (only for VUB/SSK)
    const particularlySkillfulMet = particularlySkillfulAssessments?.filter((a: any) => a.is_met).length || 0
    const particularlySkillfulTotal = particularlySkillfulAssessments?.length || 0

    return (
        <EmployeeAssessmentPresentation
            employee={employee}
            criteriaAssessments={criteriaAssessments}
            particularlySkillfulMet={particularlySkillfulMet}
            particularlySkillfulTotal={particularlySkillfulTotal}
            changesSinceMeeting={changesSinceMeeting}
        />
    )
}
