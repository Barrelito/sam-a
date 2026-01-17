'use client'

// Read-only vy av särskild yrkesskicklighet bedömningar
// Används i dialog för att visa alla bedömningar

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, XCircle } from 'lucide-react'
import { getCriteriaForEmployeeCategory } from '@/lib/salary-review/particularly-skilled-criteria'
import type { ParticularlySkillfulAssessment, EmployeeCategory } from '@/lib/salary-review/types'

interface ParticularlySkillfulReadOnlyProps {
    assessments: ParticularlySkillfulAssessment[]
    employeeCategory: EmployeeCategory
}

export default function ParticularlySkillfulReadOnly({
    assessments,
    employeeCategory
}: ParticularlySkillfulReadOnlyProps) {
    const criteria = getCriteriaForEmployeeCategory(employeeCategory)

    if (!criteria) {
        return (
            <div className="text-center text-muted-foreground py-8">
                Denna kategori har inga kriterier för särskild yrkesskicklighet
            </div>
        )
    }

    // Skapa en map för snabb lookup av bedömningar
    const assessmentMap = new Map(
        assessments.map(a => [a.criterion_key, a])
    )

    return (
        <div className="space-y-6">
            {criteria.map((criterion, criterionIndex) => (
                <div key={criterion.id} className="space-y-4">
                    {/* Huvudkriterium */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h3 className="font-medium text-blue-900 mb-1">
                            {criterionIndex + 1}. {criterion.title}
                        </h3>
                        <p className="text-sm text-blue-700">
                            {criterion.description}
                        </p>
                    </div>

                    {/* Subkriterier */}
                    <div className="space-y-3 ml-4">
                        {criterion.subcriteria.map((subcriterion) => {
                            const assessment = assessmentMap.get(subcriterion.id)
                            const isMet = assessment?.is_met || false

                            return (
                                <div
                                    key={subcriterion.id}
                                    className={`p-4 rounded-lg border-2 ${isMet
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-300 bg-gray-50'
                                        }`}
                                >
                                    {/* Kriterietext och status */}
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="mt-0.5">
                                            {isMet ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            ) : (
                                                <Circle className="h-5 w-5 text-gray-400" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-mono text-muted-foreground">
                                                    {subcriterion.id}
                                                </span>
                                                <Badge variant={isMet ? "default" : "secondary"}>
                                                    {isMet ? "Uppfyllt" : "Ej uppfyllt"}
                                                </Badge>
                                            </div>
                                            <p className="text-sm font-medium">
                                                {subcriterion.text}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Evidence */}
                                    {assessment?.evidence && (
                                        <div className="ml-8 mb-3 p-3 bg-white rounded border border-gray-200">
                                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                                Konkreta exempel (Bevis):
                                            </p>
                                            <p className="text-sm">
                                                {assessment.evidence}
                                            </p>
                                        </div>
                                    )}

                                    {/* Notes */}
                                    {assessment?.notes && (
                                        <div className="ml-8 p-3 bg-white rounded border border-gray-200">
                                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                                Anteckningar:
                                            </p>
                                            <p className="text-sm">
                                                {assessment.notes}
                                            </p>
                                        </div>
                                    )}

                                    {/* Om ej bedömt */}
                                    {!assessment && (
                                        <div className="ml-8 p-3 bg-yellow-50 rounded border border-yellow-200">
                                            <p className="text-sm text-yellow-700">
                                                Ej bedömd
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}
