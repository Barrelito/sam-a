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

        // Find review for this employee (get most recent one)
        const { data: review, error: reviewError } = await supabase
            .from('salary_reviews')
            .select('proposed_increase, final_increase')
            .eq('employee_id', employeeId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (reviewError || !review) {
            console.error('No active review found:', reviewError)
            return { employee, review: { proposed_increase: 0, final_increase: 0 } }
        }

        console.log('Review data:', review)

        return {
            employee,
            review
        }
    } catch (error) {
        console.error('Error fetching salary data:', error)
        return null
    }
}

export default async function SalaryViewPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const data = await getEmployeeSalaryData(id)

    if (!data || !data.employee) {
        notFound()
    }

    const { employee, review } = data

    // Get proposed increase (use final_increase if set, otherwise proposed_increase)
    const proposedIncrease = review?.final_increase || review?.proposed_increase || 0
    const newSalary = employee.current_salary + proposedIncrease

    return (
        <EmployeeSalaryPresentation
            employee={employee}
            proposedIncrease={proposedIncrease}
            newSalary={newSalary}
        />
    )
}
