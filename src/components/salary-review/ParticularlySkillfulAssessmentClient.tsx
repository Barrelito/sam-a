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
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [assessments, setAssessments] = useState<Record<string, { is_met: boolean, evidence: string, notes: string }>>({})
    const [saveResult, setSaveResult] = useState<{
        success: boolean,
        is_particularly_skilled: boolean,
        met_count: number,
        total_count: number
    } | null>(null)

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
            } finally {
                setLoading(false)
            }
        }

        loadAssessments()
    }, [review.id])

    const handleToggle = (criterionKey: string, checked: boolean) => {
        setAssessments(prev => ({
            ...prev,
            [criterionKey]: {
                ...prev[criterionKey],
                is_met: checked,
                evidence: prev[criterionKey]?.evidence || '',
                notes: prev[criterionKey]?.notes || ''
            }
        }))
    }

    const handleEvidenceChange = (criterionKey: string, value: string) => {
        setAssessments(prev => ({
            ...prev,
            [criterionKey]: {
                ...prev[criterionKey],
                is_met: prev[criterionKey]?.is_met || false,
                evidence: value,
                notes: prev[criterionKey]?.notes || ''
            }
        }))
    }

    const handleSave = async () => {
        setSaving(true)
        setSaveResult(null) // Reset previous result
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

            // Set result to show colored card
            setSaveResult({
                success: true,
                is_particularly_skilled: result.is_particularly_skilled,
                met_count: result.met_count,
                total_count: result.total_count
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
                                                    Konkreta exempel och bevis
                                                </Label>
                                                <Textarea
                                                    id={`${sub.id}-evidence`}
                                                    value={assessment.evidence}
                                                    onChange={(e) => handleEvidenceChange(sub.id, e.target.value)}
                                                    placeholder="Beskriv konkreta exempel som visar att detta kriterium är uppfyllt..."
                                                    rows={3}
                                                    className="resize-none"
                                                />
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
                <Card className={`mt-6 ${saveResult.is_particularly_skilled
                        ? 'bg-green-50 border-green-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                    <CardHeader>
                        <CardTitle className={
                            saveResult.is_particularly_skilled
                                ? 'text-green-900 flex items-center gap-2'
                                : 'text-yellow-900 flex items-center gap-2'
                        }>
                            {saveResult.is_particularly_skilled ? (
                                <>
                                    <CheckCircle2 className="h-6 w-6" />
                                    Särskilt yrkesskicklig
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="h-6 w-6" />
                                    Inte särskilt yrkesskicklig
                                </>
                            )}
                        </CardTitle>
                        <CardDescription className={
                            saveResult.is_particularly_skilled ? 'text-green-700' : 'text-yellow-700'
                        }>
                            Bedömning sparad: {saveResult.met_count} av {saveResult.total_count} kriterier uppfyllda
                            ({Math.round((saveResult.met_count / saveResult.total_count) * 100)}%)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className={
                        saveResult.is_particularly_skilled ? 'text-sm text-green-900' : 'text-sm text-yellow-900'
                    }>
                        {saveResult.is_particularly_skilled ? (
                            <p>
                                ✅ Medarbetaren uppfyller kriterierna för särskild yrkesskicklighet (minst 80% krävs).
                            </p>
                        ) : (
                            <p>
                                ℹ️ Medarbetaren uppfyller inte kriterierna för särskild yrkesskicklighet ännu.
                                Minst {Math.ceil(saveResult.total_count * 0.8)} kriterier krävs (80%).
                            </p>
                        )}
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
                        <li>Bocka i de kriterier som medarbetaren uppfyller</li>
                        <li>För varje ibockat kriterium, ange konkreta exempel</li>
                        <li>Bedömningen sparas automatiskt när du klickar på "Spara bedömning"</li>
                        <li>Du kan återkomma och ändra bedömningen när som helst</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    )
}
