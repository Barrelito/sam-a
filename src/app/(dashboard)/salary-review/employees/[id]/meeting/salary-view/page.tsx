import { notFound } from 'next/navigation'
import EmployeeSalaryPresentation from '@/components/salary-review/EmployeeSalaryPresentation'

async function getEmployeeSalaryData(employeeId: string) {
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
        console.error('Error fetching salary data:', error)
        return null
    }
}

export default async function SalaryViewPage({
    params
}: {
    params: { id: string }
}) {
    const data = await getEmployeeSalaryData(params.id)

    if (!data || !data.employee || !data.review) {
        notFound()
    }

    const { employee, review } = data

    // Get proposed increase (use final_increase if set, otherwise proposed_increase)
    const proposedIncrease = review.final_increase || review.proposed_increase || 0
    const newSalary = employee.current_salary + proposedIncrease

    return (
        <EmployeeSalaryPresentation
            employee={employee}
            proposedIncrease={proposedIncrease}
            newSalary={newSalary}
        />
    )
}
