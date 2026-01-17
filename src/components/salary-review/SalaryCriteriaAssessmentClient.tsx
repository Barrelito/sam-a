'use client'

// Bedömning av lönekriterier
// Client component
// Updated: Evidence is now optional

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save, Loader2, AlertCircle, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import type { CategoryDefinition, CriteriaRating } from '@/lib/salary-review/types'
import { RATING_DISPLAY_NAMES, RATING_DEFINITIONS, RATING_COLORS } from '@/lib/salary-review/salary-criteria'

interface SalaryCriteriaAssessmentClientProps {
    employee: any
    review: any
    criteria: CategoryDefinition[]
}

export default function SalaryCriteriaAssessmentClient({
    employee,
    review,
    criteria
}: SalaryCriteriaAssessmentClientProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['1'])) // First category expanded by default
    const [assessments, setAssessments] = useState<Record<string, { rating: CriteriaRating, evidence: string, notes: string }>>({})
    const [saveResult, setSaveResult] = useState<{
        success: boolean,
        assessed_count: number,
        average_rating: number
    } | null>(null)

    // Ladda befintliga bedömningar
    useEffect(() => {
        async function loadAssessments() {
            setLoading(true)
            try {
                const response = await fetch(`/api/salary-review/reviews/${review.id}/criteria`)
                const data = await response.json()

                if (data.assessments) {
                    const assessmentMap: Record<string, any> = {}
                    data.assessments.forEach((a: any) => {
                        assessmentMap[a.sub_criterion_key] = {
                            rating: a.rating,
                            evidence: a.evidence || '',
                            notes: a.notes || '',
                            category_key: a.criterion_key // Viktigt! Spara denna så vi kan skicka med den vid sparning
                        }
                    })
                    setAssessments(assessmentMap)
                }
            } catch (error) {
                console.error('Error loading assessments:', error)
            } finally {
                setLoading(false)
            }
        }

        loadAssessments()
    }, [review.id])

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev)
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId)
            } else {
                newSet.add(categoryId)
            }
            return newSet
        })
    }

    const handleRatingChange = (subCriterionKey: string, categoryKey: string, rating: CriteriaRating) => {
        setAssessments(prev => ({
            ...prev,
            [subCriterionKey]: {
                ...prev[subCriterionKey],
                rating,
                evidence: prev[subCriterionKey]?.evidence || '',
                notes: prev[subCriterionKey]?.notes || '',
                category_key: categoryKey
            }
        }))
    }

    const handleEvidenceChange = (subCriterionKey: string, value: string) => {
        setAssessments(prev => ({
            ...prev,
            [subCriterionKey]: {
                ...prev[subCriterionKey],
                evidence: value
            }
        }))
    }

    const handleSave = async () => {
        setSaving(true)
        setSaveResult(null) // Reset previous result
        try {
            // Evidence är nu frivilligt - ingen validering

            // Konvertera till array format
            const assessmentArray = Object.entries(assessments)
                .filter(([_, data]) => data.rating) // Endast de som har rating
                .map(([sub_criterion_key, data]) => ({
                    criterion_key: (data as any).category_key,
                    sub_criterion_key,
                    rating: data.rating,
                    evidence: data.evidence,
                    notes: data.notes
                }))

            if (assessmentArray.length === 0) {
                alert('Du måste bedöma minst ett kriterium!')
                setSaving(false)
                return
            }

            const response = await fetch(`/api/salary-review/reviews/${review.id}/criteria`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assessments: assessmentArray })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save')
            }

            // Set result to show colored card
            setSaveResult({
                success: true,
                assessed_count: result.assessed_count,
                average_rating: result.average_rating
            })

            router.refresh()
        } catch (error) {
            console.error('Error saving:', error)
            alert(`Fel: ${error instanceof Error ? error.message : 'Kunde inte spara'}`)
        } finally {
            setSaving(false)
        }
    }

    // Räkna statistik
    const totalCriteria = criteria.reduce((sum, c) => sum + c.subcriteria.length, 0)
    const assessedCount = Object.values(assessments).filter(a => a.rating).length
    const completionPercentage = totalCriteria > 0 ? Math.round((assessedCount / totalCriteria) * 100) : 0

    if (loading) {
        return (
            <div className="container mx-auto py-8 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            {/* Header */}
            <Link href={`/salary-review/employees/${employee.id}`}>
                <Button variant="ghost" className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tillbaka
                </Button>
            </Link>

            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Bedömning av lönekriterier</h1>
                <p className="text-muted-foreground">
                    {employee.first_name} {employee.last_name}
                </p>
            </div>

            {/* Progress */}
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Bedömda kriterier</span>
                        <span className="text-sm text-muted-foreground">{assessedCount} / {totalCriteria}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${completionPercentage}%` }}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Rating Legend */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-base">Bedömningsskala</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {(Object.keys(RATING_DEFINITIONS) as CriteriaRating[]).map(rating => (
                        <div key={rating} className="flex items-start gap-3">
                            <div className={`px-3 py-1 rounded-md text-sm font-medium ${RATING_COLORS[rating]}`}>
                                {RATING_DISPLAY_NAMES[rating]}
                            </div>
                            <p className="text-sm text-muted-foreground flex-1">
                                {RATING_DEFINITIONS[rating]}
                            </p>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Criteria Categories */}
            <div className="space-y-4">
                {criteria.map((category) => {
                    const isExpanded = expandedCategories.has(category.id)
                    const categoryAssessed = category.subcriteria.filter(sub =>
                        assessments[sub.id]?.rating
                    ).length

                    return (
                        <Card key={category.id}>
                            <CardHeader
                                className="cursor-pointer hover:bg-accent/50 transition-colors"
                                onClick={() => toggleCategory(category.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                            {category.category_number}. {category.name}
                                        </CardTitle>
                                        <CardDescription className="mt-1">{category.description}</CardDescription>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {categoryAssessed} / {category.subcriteria.length}
                                    </div>
                                </div>
                            </CardHeader>

                            {isExpanded && (
                                <CardContent className="space-y-6 pt-0">
                                    {category.subcriteria.map((sub) => {
                                        const assessment = assessments[sub.id] || { rating: '', evidence: '', notes: '' }

                                        return (
                                            <div key={sub.id} className="border rounded-lg p-4 space-y-4">
                                                <div>
                                                    <Label className="text-base font-medium mb-2 block">
                                                        {sub.id}. {sub.text}
                                                    </Label>
                                                    {sub.description && (
                                                        <p className="text-sm text-muted-foreground">{sub.description}</p>
                                                    )}
                                                </div>

                                                <div className="grid gap-4">
                                                    <div>
                                                        <Label htmlFor={`${sub.id}-rating`} className="text-sm">
                                                            Bedömning *
                                                        </Label>
                                                        <Select
                                                            value={assessment.rating}
                                                            onValueChange={(value) => handleRatingChange(sub.id, category.id, value as CriteriaRating)}
                                                        >
                                                            <SelectTrigger className="mt-1">
                                                                <SelectValue placeholder="Välj bedömning" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {(Object.keys(RATING_DISPLAY_NAMES) as CriteriaRating[]).map(rating => (
                                                                    <SelectItem key={rating} value={rating}>
                                                                        {RATING_DISPLAY_NAMES[rating]}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div>
                                                        <Label htmlFor={`${sub.id}-evidence`} className="text-sm">
                                                            Konkreta exempel (frivilligt)
                                                        </Label>
                                                        <Textarea
                                                            id={`${sub.id}-evidence`}
                                                            value={assessment.evidence}
                                                            onChange={(e) => handleEvidenceChange(sub.id, e.target.value)}
                                                            placeholder="Beskriv konkreta exempel från medarbetarens arbete..."
                                                            rows={3}
                                                            className="mt-1 resize-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </CardContent>
                            )}
                        </Card>
                    )
                })}
            </div>

            {/* Save Button */}
            <div className="sticky bottom-4 mt-8 flex justify-end">
                <Button
                    size="lg"
                    onClick={handleSave}
                    disabled={saving}
                    className="shadow-lg"
                >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Spara bedömning
                </Button>
            </div>

            {/* Save Result */}
            {saveResult && (
                <Card className="mt-6 bg-green-50 border-green-200">
                    <CardHeader>
                        <CardTitle className="text-green-900 flex items-center gap-2">
                            <CheckCircle2 className="h-6 w-6" />
                            Bedömning sparad!
                        </CardTitle>
                        <CardDescription className="text-green-700">
                            {saveResult.assessed_count} kriterier bedömda
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-green-900">
                        <div className="space-y-2">
                            <p>
                                <strong>Genomsnittlig rating:</strong> {saveResult.average_rating.toFixed(2)} / 4.00
                            </p>
                            <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                                <div
                                    className="bg-green-600 h-2 rounded-full transition-all"
                                    style={{ width: `${(saveResult.average_rating / 4) * 100}%` }}
                                />
                            </div>
                            <p className="text-xs text-green-700 mt-2">
                                {saveResult.average_rating >= 3.5 ? '✅ Utmärkt prestation!' :
                                    saveResult.average_rating >= 2.5 ? '👍 Mycket bra prestation!' :
                                        saveResult.average_rating >= 1.5 ? '✔️ Bra prestation' :
                                            'ℹ️ Utvecklingsområden identifierade'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Help Card */}
            <Card className="mt-6 bg-blue-50 border-blue-200">
                <CardHeader>
                    <CardTitle className="text-blue-900 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Vägledning
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-blue-900">
                    <ul className="list-disc list-inside space-y-1">
                        <li>Bedöm alla {totalCriteria} kriterier för en komplett bedömning</li>
                        <li>Välj rating-nivå för varje kriterium</li>
                        <li>Konkreta exempel är frivilligt men rekommenderas</li>
                        <li>Klicka på en kategori för att expandera/minimera</li>
                        <li>Du kan spara och återkomma när som helst</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    )
}
