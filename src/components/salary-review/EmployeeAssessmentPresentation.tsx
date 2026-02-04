'use client'

import { Card, CardContent } from '@/components/ui/card'
import { NUMERIC_RATING_VALUES } from '@/lib/salary-review/salary-criteria'

interface EmployeeAssessmentPresentationProps {
    employee: {
        first_name: string
        last_name: string
        category: string
    }
    criteriaAssessments: Array<{
        rating: string
    }>
    particularlySkillfulMet: number
    particularlySkillfulTotal: number
}

export default function EmployeeAssessmentPresentation({
    employee,
    criteriaAssessments,
    particularlySkillfulMet,
    particularlySkillfulTotal
}: EmployeeAssessmentPresentationProps) {
    // Calculate total score
    const totalScore = criteriaAssessments.reduce((sum, assessment) => {
        return sum + NUMERIC_RATING_VALUES[assessment.rating as keyof typeof NUMERIC_RATING_VALUES]
    }, 0)

    // Psychological scale calculation (same as MeetingGuideDisplay)
    let percentage = 0
    if (totalScore <= 14) {
        percentage = (totalScore / 14) * 50
    } else if (totalScore <= 21) {
        percentage = 50 + ((totalScore - 14) / 7) * 20
    } else if (totalScore <= 28) {
        percentage = 70 + ((totalScore - 21) / 7) * 15
    } else {
        percentage = 85 + ((totalScore - 28) / 14) * 15
    }

    const allCriteriaMet = particularlySkillfulMet === particularlySkillfulTotal

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-2">Bedömningssammanfattning</h1>
                    <p className="text-2xl text-muted-foreground">
                        {employee.first_name} {employee.last_name} - {employee.category}
                    </p>
                </div>

                {/* Visual Assessment Scale */}
                <Card>
                    <CardContent className="pt-6">
                        <h2 className="text-2xl font-semibold mb-6">Bedömningsresultat - visuell skala</h2>

                        <div className="space-y-4">
                            {/* Color gradient bar with position indicator */}
                            <div className="relative h-24 rounded-lg overflow-hidden border-2 border-gray-200">
                                {/* Gradient background */}
                                <div className="absolute inset-0 bg-gradient-to-r from-red-400 via-yellow-400 via-50% via-green-400 to-blue-400"></div>

                                {/* Position indicator */}
                                <div
                                    className="absolute top-0 bottom-0 w-2 bg-gray-900 shadow-lg transition-all duration-300"
                                    style={{ left: `${percentage}%` }}
                                >
                                    {/* Triangle pointer at top */}
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-gray-900"></div>
                                    {/* Triangle pointer at bottom */}
                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-gray-900"></div>
                                </div>
                            </div>

                            {/* Text labels */}
                            <div className="relative text-base h-12">
                                <div className="absolute left-[25%] -translate-x-1/2 text-red-700 font-medium text-center text-sm">
                                    Behöver<br />utvecklas
                                </div>
                                <div className="absolute left-[60%] -translate-x-1/2 text-yellow-700 font-semibold text-center text-lg">
                                    Bra
                                </div>
                                <div className="absolute left-[77.5%] -translate-x-1/2 text-green-700 font-medium text-center">
                                    Mycket bra
                                </div>
                                <div className="absolute left-[92.5%] -translate-x-1/2 text-blue-700 font-medium text-center">
                                    Utmärkt
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* SYS Status - Only for VUB and SSK */}
                {(employee.category === 'VUB' || employee.category === 'SSK') && particularlySkillfulTotal > 0 && (
                    <Card className={allCriteriaMet ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-semibold">Särskild yrkesskicklighet</h2>
                                <div className={`text-xl font-bold px-6 py-3 rounded-lg ${allCriteriaMet
                                    ? 'bg-green-100 text-green-700 border-2 border-green-200'
                                    : 'bg-yellow-100 text-yellow-700 border-2 border-yellow-200'
                                    }`}>
                                    {allCriteriaMet ? (
                                        <>✓ Alla {particularlySkillfulTotal} kriterier uppfyllda</>
                                    ) : (
                                        <>{particularlySkillfulMet} av {particularlySkillfulTotal} uppfyllda (ej SYS)</>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
