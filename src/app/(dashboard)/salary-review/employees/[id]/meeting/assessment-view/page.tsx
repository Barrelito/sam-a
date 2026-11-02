import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSelectedCycle } from '@/lib/salary-review/cycles-server'
import EmployeeAssessmentPresentation from '@/components/salary-review/EmployeeAssessmentPresentation'

async function getEmployeeMeetingData(employeeId: string) {
    const supabase = await createClient()

    try {
        // Fetch employee data
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
        const { data: review } = await supabase
            .from('salary_reviews')
            .select('id')
            .eq('employee_id', employeeId)
            .eq('cycle_id', cycle?.id ?? '')
            .maybeSingle()

        if (!review) {
            return { employee, criteriaAssessments: [], particularlySkillfulAssessments: [] }
        }

        // Fetch criteria assessments
        const { data: criteriaAssessments } = await supabase
            .from('salary_criteria_assessments')
            .select('rating')
            .eq('review_id', review.id)

        // Fetch particularly skillful assessments
        const { data: particularlySkillfulAssessments } = await supabase
            .from('particularly_skillful_assessments')
            .select('is_met')
            .eq('review_id', review.id)

        return {
            employee,
            criteriaAssessments: criteriaAssessments || [],
            particularlySkillfulAssessments: particularlySkillfulAssessments || []
        }
    } catch (error) {
        console.error('Error fetching meeting data:', error)
        return null
    }
}

// Disable layout for this presentation view
export const dynamic = 'force-dynamic'

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

    // Calculate SYS stats
    const particularlySkillfulMet = particularlySkillfulAssessments?.filter((a: any) => a.is_met).length || 0
    const particularlySkillfulTotal = particularlySkillfulAssessments?.length || 0

    return (
        <EmployeeAssessmentPresentation
            employee={employee}
            criteriaAssessments={criteriaAssessments || []}
            particularlySkillfulMet={particularlySkillfulMet}
            particularlySkillfulTotal={particularlySkillfulTotal}
        />
    )
}
