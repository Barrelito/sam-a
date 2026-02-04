'use client'

import { Card, CardContent } from '@/components/ui/card'

interface EmployeeSalaryPresentationProps {
    employee: {
        first_name: string
        last_name: string
        current_salary: number
    }
    proposedIncrease: number
    newSalary: number
}

export default function EmployeeSalaryPresentation({
    employee,
    proposedIncrease,
    newSalary
}: EmployeeSalaryPresentationProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('sv-SE').format(amount)
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-2">Förslag från lönefördelning</h1>
                    <p className="text-2xl text-muted-foreground">
                        {employee.first_name} {employee.last_name}
                    </p>
                </div>

                {/* Main Salary Card */}
                <Card className="border-2">
                    <CardContent className="pt-8 pb-8 space-y-8">
                        {/* Proposed Increase */}
                        <div className="text-center">
                            <div className="text-lg text-muted-foreground mb-2">FÖRESLAGEN PÅSLAG</div>
                            <div className="text-5xl font-bold text-primary">
                                +{formatCurrency(proposedIncrease)} kr
                            </div>
                        </div>

                        {/* New Salary */}
                        <div className="text-center pt-6 border-t-2">
                            <div className="text-lg text-muted-foreground mb-2">NY LÖN ENL. FÖRSLAG</div>
                            <div className="text-6xl font-bold">
                                {formatCurrency(newSalary)} kr/mån
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t-2 my-8"></div>

                        {/* Current Salary */}
                        <div className="text-center">
                            <div className="text-lg text-muted-foreground mb-2">Nuvarande lön:</div>
                            <div className="text-4xl font-semibold text-muted-foreground">
                                {formatCurrency(employee.current_salary)} kr/mån
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
