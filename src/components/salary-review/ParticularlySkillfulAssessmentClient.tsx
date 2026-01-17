'use client'

// Bedömning av särskild yrkesskicklighet
// /salary-review/employees/[id]/particularly-skilled

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { ParticularlySkillfulCriterion } from '@/lib/salary-review/particularly-skilled-criteria'
import { useToast } from '@/hooks/use-toast'
import { LoadingButton } from '@/components/ui/loading-button'

interface ParticularlySkillfulAssessmentPageProps {
    employee: any
    review: any
    criteria: ParticularlySkillfulCriterion[]
}

export default function ParticularlySkillfulAssessmentClient({
    employee,
    review,
    criteria
}: ParticularlySkillfulAssessmentPageProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [assessments, setAssessments] = useState<Record<string, { is_met: boolean, evidence: string, notes: string }>>({})
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

    // Ladda befintliga bedömningar
    useEffect(() => {
        async function loadAssessments() {
            setLoading(true)
            try {
                const response = await fetch(`/api/salary-review/reviews/${review.id}/particularly-skilled`)
                const data = await response.json()

                if (data.assessments) {
                    const assessmentMap: Record<string, any> = {}
                    data.assessments.forEach((a: any) => {
                        assessmentMap[a.criterion_key] = {
                            is_met: a.is_met,
                            evidence: a.evidence || '',
                            notes: a.notes || ''
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

    const validateAssessment = (criterionKey: string, data: { is_met: boolean, evidence: string }) => {
        // Validation: Evidence required if is_met is true
        if (data.is_met) {
            if (!data.evidence || data.evidence.length < 10) {
                setValidationErrors(prev => ({
                    ...prev,
                    [criterionKey]: 'När kriteriet är uppfyllt krävs konkreta exempel (minst 10 tecken)'
                }))
                return false
            }
        }
        // Clear error if valid
        setValidationErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors[criterionKey]
            return newErrors
        })
        return true
    }

    const handleToggle = (criterionKey: string, checked: boolean) => {
        const newData = {
            ...assessments[criterionKey],
            is_met: checked,
            evidence: assessments[criterionKey]?.evidence || '',
            notes: assessments[criterionKey]?.notes || ''
        }
        setAssessments(prev => ({
            ...prev,
            [criterionKey]: newData
        }))

        // Validate immediately
        validateAssessment(criterionKey, newData)
    }

    const handleEvidenceChange = (criterionKey: string, value: string) => {
        const assessment = assessments[criterionKey]
        if (assessment) {
            const newData = {
                ...assessment,
                evidence: value
            }
            setAssessments(prev => ({
                ...prev,
                [criterionKey]: newData
            }))

            // Validate if is_met
            if (assessment.is_met) {
                validateAssessment(criterionKey, newData)
            }
        }
    }

    const handleSave = async () => {
        // Validate all checked assessments before saving
        let hasErrors = false
        Object.entries(assessments).forEach(([key, data]) => {
            if (data.is_met) {
                const isValid = validateAssessment(key, data)
                if (!isValid) hasErrors = true
            }
        })

        if (hasErrors) {
            toast({
                variant: "destructive",
                title: "Validering misslyckades",
                description: "Kontrollera att alla uppfyllda kriterier har konkreta exempel."
            })
            return
        }

        setSaving(true)
        try {
            // Konvertera till array format för API
            const assessmentArray = Object.entries(assessments).map(([criterion_key, data]) => ({
                criterion_key,
                is_met: data.is_met,
                evidence: data.evidence,
                notes: data.notes
            }))

            const response = await fetch(`/api/salary-review/reviews/${review.id}/particularly-skilled`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assessments: assessmentArray })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save')
            }

            // Success toast
            const percentage = Math.round((result.met_count / result.total_count) * 100)
            toast({
                title: result.is_particularly_skilled ? "✓ Särskilt yrkesskicklig!" : "✓ Bedömning sparad!",
                description: `${result.met_count} av ${result.total_count} kriterier uppfyllda (${percentage}%)`,
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
    const totalSubcriteria = criteria.reduce((sum, c) => sum + c.subcriteria.length, 0)
    const metCount = Object.values(assessments).filter(a => a.is_met).length
    const completionPercentage = totalSubcriteria > 0 ? Math.round((metCount / totalSubcriteria) * 100) : 0

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
                <h1 className="text-3xl font-bold mb-2">Bedömning av särskild yrkesskicklighet</h1>
                <p className="text-muted-foreground">
                    {employee.first_name} {employee.last_name} ({employee.category})
                </p>
            </div>

            {/* Progress */}
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Bedömda kriterier</span>
                        <span className="text-sm text-muted-foreground">{metCount} / {totalSubcriteria}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${completionPercentage}%` }}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Criteria */}
            <div className="space-y-6">
                {criteria.map((criterion, index) => (
                    <Card key={criterion.id}>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                {index + 1}. {criterion.title}
                            </CardTitle>
                            <CardDescription>{criterion.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {criterion.subcriteria.map((sub) => {
                                const assessment = assessments[sub.id] || { is_met: false, evidence: '', notes: '' }

                                return (
                                    <div key={sub.id} className="border rounded-lg p-4 space-y-3">
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                id={sub.id}
                                                checked={assessment.is_met}
                                                onCheckedChange={(checked) => handleToggle(sub.id, checked as boolean)}
                                                className="mt-1"
                                            />
                                            <div className="flex-1">
                                                <Label
                                                    htmlFor={sub.id}
                                                    className="text-sm font-normal leading-relaxed cursor-pointer"
                                                >
                                                    {sub.text}
                                                </Label>
                                            </div>
                                            {assessment.is_met && (
                                                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                            )}
                                        </div>

                                        {assessment.is_met && (
                                            <div className="ml-8 space-y-2">
                                                <Label htmlFor={`${sub.id}-evidence`} className="text-sm font-medium">
                                                    Konkreta exempel och bevis <span className="text-red-600">*</span>
                                                </Label>
                                                <Textarea
                                                    id={`${sub.id}-evidence`}
                                                    value={assessment.evidence}
                                                    onChange={(e) => handleEvidenceChange(sub.id, e.target.value)}
                                                    placeholder="Beskriv konkreta exempel som visar att detta kriterium är uppfyllt..."
                                                    rows={3}
                                                    className={`resize-none ${validationErrors[sub.id] ? 'border-red-500' : ''}`}
                                                />
                                                {validationErrors[sub.id] && (
                                                    <p className="text-sm text-red-600 mt-1">{validationErrors[sub.id]}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                ))}
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
                        <li>Bocka i de kriterier som medarbetaren uppfyller</li>
                        <li><strong>OBS:</strong> Konkreta exempel är <strong>obligatoriskt</strong> för alla uppfyllda kriterier</li>
                        <li>Bedömningen sparas när du klickar på "Spara bedömning"</li>
                        <li>Du kan återkomma och ändra bedömningen när som helst</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    )
}
