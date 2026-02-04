import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

        // Find review for this employee (get most recent one)
        const { data: review, error: reviewError } = await supabase
            .from('salary_reviews')
            .select('id')
            .eq('employee_id', employeeId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

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
            .select('rating')
            .eq('salary_review_id', review.id)

        console.log('Criteria assessments:', criteriaAssessments, criteriaError)

        // Fetch particularly skillful assessments (only for VUB and SSK)
        let particularlySkillfulAssessments = []
        if (employee.category === 'VUB' || employee.category === 'SSK') {
            const { data: psAssessments } = await supabase
                .from('particularly_skillful_assessments')
                .select('is_met')
                .eq('salary_review_id', review.id)

            particularlySkillfulAssessments = psAssessments || []
        }

        return {
            employee,
            criteriaAssessments: criteriaAssessments || [],
            particularlySkillfulAssessments
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

    // Calculate SYS stats (only for VUB/SSK)
    const particularlySkillfulMet = particularlySkillfulAssessments?.filter((a: any) => a.is_met).length || 0
    const particularlySkillfulTotal = particularlySkillfulAssessments?.length || 0

    return (
        <EmployeeAssessmentPresentation
            employee={employee}
            criteriaAssessments={criteriaAssessments}
            particularlySkillfulMet={particularlySkillfulMet}
            particularlySkillfulTotal={particularlySkillfulTotal}
        />
    )
}
