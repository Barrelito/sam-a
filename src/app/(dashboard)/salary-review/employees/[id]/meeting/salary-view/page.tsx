import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EmployeeSalaryPresentation from '@/components/salary-review/EmployeeSalaryPresentation'

async function getEmployeeSalaryData(employeeId: string) {
    const supabase = await createClient()

    try {
        // Fetch employee with salary data
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('id, first_name, last_name, current_salary')
            .eq('id', employeeId)
            .single()

        if (empError || !employee) {
            console.error('Error fetching employee:', empError)
            return null
        }

        // Find active review for this employee
        const { data: review } = await supabase
            .from('salary_reviews')
            .select('proposed_increase, final_increase, skilled_amount')
            .eq('employee_id', employeeId)
            .eq('is_active', true)
            .single()

        return {
            employee,
            review: review || { proposed_increase: 0, final_increase: 0, skilled_amount: 0 }
        }
    } catch (error) {
        console.error('Error fetching salary data:', error)
        return null
    }
}

// Disable layout for this presentation view
export const dynamic = 'force-dynamic'

export default async function SalaryViewPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const data = await getEmployeeSalaryData(id)

    if (!data || !data.employee || !data.review) {
        notFound()
    }

    const { employee, review } = data

    // Get proposed increase (use final_increase if set, otherwise proposed_increase)
    const baseIncrease = review.final_increase || review.proposed_increase || 0
    const skilledAmount = review.skilled_amount || 0
    const proposedIncrease = baseIncrease + skilledAmount
    const newSalary = employee.current_salary + proposedIncrease

    return (
        <EmployeeSalaryPresentation
            employee={employee}
            proposedIncrease={proposedIncrease}
            newSalary={newSalary}
        />
    )
}
