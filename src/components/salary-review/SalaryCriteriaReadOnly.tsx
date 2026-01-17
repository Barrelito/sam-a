'use client'

// Read-only vy av lönekriterier bedömningar
// Används i dialog för att visa alla bedömningar

import { Badge } from '@/components/ui/badge'
import { SALARY_CRITERIA, RATING_DISPLAY_NAMES, RATING_COLORS } from '@/lib/salary-review/salary-criteria'
import type { SalaryCriteriaAssessment } from '@/lib/salary-review/types'

interface SalaryCriteriaReadOnlyProps {
    assessments: SalaryCriteriaAssessment[]
}

export default function SalaryCriteriaReadOnly({
    assessments
}: SalaryCriteriaReadOnlyProps) {
    // Skapa en map för snabb lookup av bedömningar
    const assessmentMap = new Map(
        assessments.map(a => [`${a.criterion_key}_${a.sub_criterion_key}`, a])
    )

    return (
        <div className="space-y-6">
            {SALARY_CRITERIA.map((category) => {
                // Hitta bedömningar för denna kategori
                const categoryAssessments = assessments.filter(
                    a => a.criterion_key === category.id
                )

                return (
                    <div key={category.id} className="space-y-4">
                        {/* Huvudkategori */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h3 className="font-medium text-blue-900 mb-1">
                                {category.category_number}. {category.name}
                            </h3>
                            <p className="text-sm text-blue-700">
                                {category.description}
                            </p>
                            {categoryAssessments.length > 0 && (
                                <div className="mt-2">
                                    <Badge variant="outline" className="bg-white">
                                        {categoryAssessments.length} bedömningar
                                    </Badge>
                                </div>
                            )}
                        </div>

                        {/* Underkriterier */}
                        <div className="space-y-3 ml-4">
                            {category.subcriteria.map((subcriterion) => {
                                const assessment = assessmentMap.get(`${category.id}_${subcriterion.id}`)

                                return (
                                    <div
                                        key={subcriterion.id}
                                        className={`p-4 rounded-lg border-2 ${assessment
                                            ? 'border-blue-300 bg-white'
                                            : 'border-gray-200 bg-gray-50'
                                            }`}
                                    >
                                        {/* Kriterietext */}
                                        <div className="mb-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-mono text-muted-foreground">
                                                    {subcriterion.id}
                                                </span>
                                                {assessment && (
                                                    <Badge
                                                        variant="outline"
                                                        className={RATING_COLORS[assessment.rating as keyof typeof RATING_COLORS]}
                                                    >
                                                        {RATING_DISPLAY_NAMES[assessment.rating as keyof typeof RATING_DISPLAY_NAMES]}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm font-medium">
                                                {subcriterion.text}
                                            </p>
                                            {subcriterion.description && (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {subcriterion.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Evidence */}
                                        {assessment?.evidence && (
                                            <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                                                <p className="text-xs font-medium text-blue-900 mb-1">
                                                    Konkreta exempel (Bevis):
                                                </p>
                                                <p className="text-sm text-blue-800">
                                                    {assessment.evidence}
                                                </p>
                                            </div>
                                        )}

                                        {/* Notes */}
                                        {assessment?.notes && (
                                            <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                                                <p className="text-xs font-medium text-yellow-900 mb-1">
                                                    Anteckningar:
                                                </p>
                                                <p className="text-sm text-yellow-800">
                                                    {assessment.notes}
                                                </p>
                                            </div>
                                        )}

                                        {/* Om ej bedömt */}
                                        {!assessment && (
                                            <div className="p-3 bg-gray-100 rounded border border-gray-200">
                                                <p className="text-sm text-gray-600">
                                                    Ej bedömd
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
