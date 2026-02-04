import { notFound } from 'next/navigation'
import EmployeeAssessmentPresentation from '@/components/salary-review/EmployeeAssessmentPresentation'

async function getEmployeeMeetingData(employeeId: string) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    try {
        const response = await fetch(`${baseUrl}/api/salary-review/employees/${employeeId}/meeting`, {
            cache: 'no-store'
        })

        if (!response.ok) {
            return null
        }

        return await response.json()
    } catch (error) {
        console.error('Error fetching meeting data:', error)
        return null
    }
}

export default async function AssessmentViewPage({
    params
}: {
    params: { id: string }
}) {
    const data = await getEmployeeMeetingData(params.id)

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
