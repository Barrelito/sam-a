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
import { useToast } from '@/hooks/use-toast'
import { LoadingButton } from '@/components/ui/loading-button'

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
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['1'])) // First category expanded by default
    const [assessments, setAssessments] = useState<Record<string, { rating: CriteriaRating, evidence: string, notes: string }>>({})
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

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
                toast({
                    variant: "destructive",
                    title: "Fel vid laddning",
                    description: "Kunde inte ladda bedömningar. Försök igen."
                })
            } finally {
                setLoading(false)
            }
        }

        loadAssessments()
    }, [review.id, toast])

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

    const validateAssessment = (subCriterionKey: string, data: { rating: CriteriaRating, evidence: string }) => {
        // Validation removed as per user request
        setValidationErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors[subCriterionKey]
            return newErrors
        })
        return true
    }

    const handleRatingChange = (subCriterionKey: string, categoryKey: string, rating: CriteriaRating) => {
        const newData = {
            ...assessments[subCriterionKey],
            rating,
            evidence: assessments[subCriterionKey]?.evidence || '',
            notes: assessments[subCriterionKey]?.notes || '',
            category_key: categoryKey
        }
        setAssessments(prev => ({
            ...prev,
            [subCriterionKey]: newData
        }))
    }

    const handleEvidenceChange = (subCriterionKey: string, value: string) => {
        const assessment = assessments[subCriterionKey]
        if (assessment) {
            const newData = {
                ...assessment,
                evidence: value
            }
            setAssessments(prev => ({
                ...prev,
                [subCriterionKey]: newData
            }))
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
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
                toast({
                    variant: "destructive",
                    title: "Ingen bedömning gjord",
                    description: "Du måste bedöma minst ett kriterium!"
                })
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

            // Success toast
            toast({
                title: "✓ Bedömning sparad!",
                description: `${result.assessed_count} kriterier bedömda. Genomsnitt: ${result.average_rating.toFixed(2)} / 4.0`,
                variant: "default"
            })

            router.refresh()
        } catch (error) {
            console.error('Error saving:', error)
            toast({
                variant: "destructive",
                title: "Fel vid sparande",
                description: error instanceof Error ? error.message : 'Kunde inte spara. Försök igen.'
            })
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
        <div className="container mx-auto py-8 max-w-4xl relative">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <Link href={`/salary-review/employees/${employee.id}`}>
                        <Button variant="ghost" className="mb-4">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Tillbaka
                        </Button>
                    </Link>

                    <div>
                        <h1 className="text-3xl font-bold mb-2">Bedömning av lönekriterier</h1>
                        <p className="text-muted-foreground">
                            {employee.first_name} {employee.last_name}
                        </p>
                    </div>
                </div>
            </div>

            {/* Rating Legend - Prominent */}
            <div className="sticky top-4 z-10 mb-8 shadow-md">
                <Card className="border-l-4 border-l-blue-500 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-blue-500" />
                            Bedömningsskala
                        </CardTitle>
                        <CardDescription>
                            Används för att bedöma måluppfyllelse och beteende
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                        {(Object.keys(RATING_DEFINITIONS) as CriteriaRating[]).map(rating => (
                            <div key={rating} className="flex flex-col gap-1 p-2 rounded-md hover:bg-slate-50 transition-colors">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold w-fit ${RATING_COLORS[rating]}`}>
                                    {RATING_DISPLAY_NAMES[rating]}
                                </span>
                                <p className="text-sm text-slate-600 leading-snug">
                                    {RATING_DEFINITIONS[rating]}
                                </p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
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
                                                            Konkreta exempel
                                                        </Label>
                                                        <Textarea
                                                            id={`${sub.id}-evidence`}
                                                            value={assessment.evidence}
                                                            onChange={(e) => handleEvidenceChange(sub.id, e.target.value)}
                                                            placeholder="Beskriv konkreta exempel från medarbetarens arbete..."
                                                            rows={3}
                                                            className={`mt-1 resize-none ${validationErrors[sub.id] ? 'border-red-500' : ''}`}
                                                        />
                                                        {validationErrors[sub.id] && (
                                                            <p className="text-sm text-red-600 mt-1">{validationErrors[sub.id]}</p>
                                                        )}
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
                <LoadingButton
                    size="lg"
                    onClick={handleSave}
                    isLoading={saving}
                    loadingText="Sparar bedömning..."
                    className="shadow-lg"
                >
                    <Save className="mr-2 h-4 w-4" />
                    Spara bedömning
                </LoadingButton>
            </div>



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
                        <li>Konkreta exempel är valfria men rekommenderas för att stärka motiveringen</li>
                        <li>Klicka på en kategori för att expandera/minimera</li>
                        <li>Du kan spara och återkomma när som helst</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    )
}
