'use client'

// Samtalsguide för lönesamtal
// Visar interaktiv checklista och bedömningssammanfattning

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CheckCircle2, Circle, Eye, Lightbulb, MessageSquare, Monitor } from 'lucide-react'
import { MEETING_STRUCTURE, CONVERSATION_TEMPLATES, MEETING_CHECKLIST } from '@/lib/salary-review/meeting-guide'
import { SALARY_CRITERIA, RATING_DISPLAY_NAMES, RATING_COLORS, NUMERIC_RATING_VALUES } from '@/lib/salary-review/salary-criteria'
import type { SalaryCriteriaAssessment, ParticularlySkillfulAssessment, EmployeeWithDetails } from '@/lib/salary-review/types'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { findCriterionByKey } from '@/lib/salary-review/particularly-skilled-criteria'
import ParticularlySkillfulReadOnly from './ParticularlySkillfulReadOnly'
import SalaryCriteriaReadOnly from './SalaryCriteriaReadOnly'
import { Button } from '@/components/ui/button'

interface MeetingGuideDisplayProps {
    reviewId: string
    employee: EmployeeWithDetails
    criteriaAssessments: SalaryCriteriaAssessment[]
    particularlySkillfulAssessments?: ParticularlySkillfulAssessment[]
    preparation: any
}

export default function MeetingGuideDisplay({
    reviewId,
    employee,
    criteriaAssessments,
    particularlySkillfulAssessments,
    preparation
}: MeetingGuideDisplayProps) {
    // Generera localStorage-nyckel baserat på reviewId
    const storageKey = `meeting-checklist-${reviewId}`

    // Initiera med sparad data från localStorage, eller tom
    const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>(() => {
        if (typeof window === 'undefined') return {}
        try {
            const saved = localStorage.getItem(storageKey)
            return saved ? JSON.parse(saved) : {}
        } catch {
            return {}
        }
    })

    // Spara till localStorage när checkedSteps ändras
    useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            localStorage.setItem(storageKey, JSON.stringify(checkedSteps))
        } catch (error) {
            console.error('Could not save checklist to localStorage:', error)
        }
    }, [checkedSteps, storageKey])

    const toggleStep = (stepId: string) => {
        setCheckedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }))
    }

    // Räkna bedömningar per rating
    const ratingCounts = criteriaAssessments.reduce((acc, assessment) => {
        acc[assessment.rating] = (acc[assessment.rating] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    // Särskild yrkesskicklighet
    const particularlySkillfulMet = particularlySkillfulAssessments?.filter(a => a.is_met).length || 0
    const particularlySkillfulTotal = particularlySkillfulAssessments?.length || 0

    return (
        <div className="space-y-6">
            {/* Intro */}
            <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>
                    <p className="font-medium mb-2">{MEETING_STRUCTURE.description}</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                        {MEETING_STRUCTURE.tips?.map((tip, index) => (
                            <li key={index}>{tip}</li>
                        ))}
                    </ul>
                </AlertDescription>
            </Alert>

            {/* Assessment Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Bedömningssammanfattning</CardTitle>
                    <CardDescription>
                        Översikt av medarbetarens bedömningar - klicka för att se detaljer
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Visual Assessment Scale */}
                    <div className="mb-8">
                        <h4 className="font-medium mb-4">Bedömningsresultat - visuell skala</h4>

                        {(() => {
                            // Calculate total score from all assessments
                            const totalScore = criteriaAssessments.reduce((sum, assessment) => {
                                return sum + NUMERIC_RATING_VALUES[assessment.rating as keyof typeof NUMERIC_RATING_VALUES]
                            }, 0)

                            // Psychological scale with "Bra" centered at 50%:
                            // 0-14p: 0-50% (entire left half = below "Bra")
                            // 14p: exactly 50% ("Bra" baseline at center)
                            // 14-21p: 50-70% (solid "Bra", clearly above center)
                            // 21-28p: 70-85% ("Mycket bra")
                            // 28-42p: 85-100% ("Utmärkt")

                            let percentage = 0
                            if (totalScore <= 14) {
                                // 0-14 points → 0-50% (left half)
                                percentage = (totalScore / 14) * 50
                            } else if (totalScore <= 21) {
                                // 14-21 points → 50-70% ("Bra" zone)
                                percentage = 50 + ((totalScore - 14) / 7) * 20
                            } else if (totalScore <= 28) {
                                // 21-28 points → 70-85% ("Mycket bra")
                                percentage = 70 + ((totalScore - 21) / 7) * 15
                            } else {
                                // 28-42 points → 85-100% ("Utmärkt")
                                percentage = 85 + ((totalScore - 28) / 14) * 15
                            }
                            return (
                                <div className="space-y-3">
                                    {/* Color gradient bar with position indicator */}
                                    <div className="relative h-16 rounded-lg overflow-hidden border-2 border-gray-200">
                                        {/* Gradient background */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-red-400 via-yellow-400 via-50% via-green-400 to-blue-400"></div>

                                        {/* Position indicator */}
                                        <div
                                            className="absolute top-0 bottom-0 w-1 bg-gray-900 shadow-lg transition-all duration-300"
                                            style={{ left: `${percentage}%` }}
                                        >
                                            {/* Triangle pointer at top */}
                                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-gray-900"></div>
                                            {/* Triangle pointer at bottom */}
                                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-gray-900"></div>
                                        </div>
                                    </div>

                                    {/* Text labels positioned according to their zones */}
                                    <div className="relative text-xs mt-2 h-8">
                                        <div className="absolute left-[25%] -translate-x-1/2 text-red-700 font-medium text-center max-w-[20%] text-[10px] leading-tight">
                                            Behöver<br />utvecklas
                                        </div>
                                        <div className="absolute left-[60%] -translate-x-1/2 text-yellow-700 font-medium text-center">
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
                            )
                        })()}
                    </div>

                    {/* Particularly Skillful - Button to open dialog */}
                    {particularlySkillfulAssessments && particularlySkillfulAssessments.length > 0 && (
                        <div className="pt-4 border-t">
                            <div className={`flex items-center justify-between p-4 border-2 rounded-lg transition-colors ${particularlySkillfulMet === particularlySkillfulTotal
                                ? 'border-green-200 bg-green-50 hover:bg-green-100'
                                : 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                                }`}>
                                <div className="flex-1">
                                    <h4 className="font-medium mb-1">Särskild yrkesskicklighet</h4>
                                    <div className="flex items-center gap-2">
                                        {particularlySkillfulMet === particularlySkillfulTotal ? (
                                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                                                ✓ Alla {particularlySkillfulTotal} kriterier uppfyllda
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                                                {particularlySkillfulMet} av {particularlySkillfulTotal} uppfyllda (ej SYS)
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <Eye className="mr-2 h-4 w-4" />
                                            Visa bedömning
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>Bedömning av särskild yrkesskicklighet</DialogTitle>
                                            <DialogDescription>
                                                {employee.first_name} {employee.last_name} - {employee.category}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <ParticularlySkillfulReadOnly
                                            assessments={particularlySkillfulAssessments}
                                            employeeCategory={employee.category}
                                        />
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    )}

                    {/* Salary Criteria - Button to open dialog */}
                    <div className="pt-4 border-t">
                        <div className="flex items-center justify-between p-4 border-2 border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                            <div className="flex-1">
                                <h4 className="font-medium mb-1">Lönekriterier</h4>
                                <Badge variant="outline" className="bg-blue-100 text-blue-700">
                                    {criteriaAssessments.length} bedömningar
                                </Badge>
                            </div>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Eye className="mr-2 h-4 w-4" />
                                        Visa bedömning
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Bedömning av lönekriterier</DialogTitle>
                                        <DialogDescription>
                                            {employee.first_name} {employee.last_name}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <SalaryCriteriaReadOnly
                                        assessments={criteriaAssessments}
                                    />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* Key Strengths from Preparation */}
                    {preparation?.strengths_summary && (
                        <div className="pt-4 border-t">
                            <h4 className="font-medium mb-2">Styrkor (från förberedelse)</h4>
                            <p className="text-sm">{preparation.strengths_summary}</p>
                        </div>
                    )}

                    {/* Development Areas */}
                    {preparation?.development_needs && (
                        <div className="pt-4 border-t">
                            <h4 className="font-medium mb-2">Utvecklingsområden (från förberedelse)</h4>
                            <p className="text-sm">{preparation.development_needs}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Integrated Meeting Structure with Conversation Templates */}
            <Card>
                <CardHeader>
                    <CardTitle>Samtalsstruktur & Formuleringsförslag</CardTitle>
                    <CardDescription>
                        Följ dessa steg under lönesamtalet - klicka för att se förslag på hur du kan formulera dig
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {/* Step 1: Klargör syftet */}
                        <div className="border rounded-lg">
                            <div className="flex items-start gap-3 p-3">
                                <Checkbox
                                    id="step-0"
                                    checked={checkedSteps['step-0'] || false}
                                    onCheckedChange={() => toggleStep('step-0')}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <Label htmlFor="step-0" className="cursor-pointer font-medium">
                                        <div className={checkedSteps['step-0'] ? 'line-through text-muted-foreground' : ''}>
                                            1. Klargör syftet med samtalet
                                        </div>
                                    </Label>
                                    <Accordion type="single" collapsible className="w-full mt-2">
                                        <AccordionItem value="suggestions-0" className="border-none">
                                            <AccordionTrigger className="text-xs text-muted-foreground hover:text-foreground py-1">
                                                <span className="flex items-center gap-1">
                                                    <Lightbulb className="h-3 w-3" />
                                                    Formuleringsförslag
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <ul className="list-disc list-inside space-y-1 text-sm pl-2">
                                                    {CONVERSATION_TEMPLATES.opening.map((template, idx) => (
                                                        <li key={idx} className="text-muted-foreground">{template}</li>
                                                    ))}
                                                </ul>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Berätta om upplägg */}
                        <div className="border rounded-lg">
                            <div className="flex items-start gap-3 p-3">
                                <Checkbox
                                    id="step-1"
                                    checked={checkedSteps['step-1'] || false}
                                    onCheckedChange={() => toggleStep('step-1')}
                                    className="mt-1"
                                />
                                <Label htmlFor="step-1" className="cursor-pointer flex-1 font-medium">
                                    <div className={checkedSteps['step-1'] ? 'line-through text-muted-foreground' : ''}>
                                        2. Berätta om samtalets upplägg och hur mycket tid ni har
                                    </div>
                                </Label>
                            </div>
                        </div>

                        {/* Step 3: Redogör för bedömningsgrunder */}
                        <div className="border rounded-lg">
                            <div className="flex items-start gap-3 p-3">
                                <Checkbox
                                    id="step-2"
                                    checked={checkedSteps['step-2'] || false}
                                    onCheckedChange={() => toggleStep('step-2')}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <Label htmlFor="step-2" className="cursor-pointer font-medium">
                                        <div className={checkedSteps['step-2'] ? 'line-through text-muted-foreground' : ''}>
                                            3. Redogör för de bedömningsgrunder du använt
                                        </div>
                                    </Label>

                                    {/* Employee view button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-2"
                                        onClick={() => window.open(
                                            `/salary-review/employees/${employee.id}/meeting/assessment-view`,
                                            'assessment',
                                            'width=1200,height=800'
                                        )}
                                    >
                                        <Monitor className="mr-2 h-4 w-4" />
                                        Visa för medarbetaren
                                    </Button>

                                    <Accordion type="single" collapsible className="w-full mt-2">
                                        <AccordionItem value="suggestions-2" className="border-none">
                                            <AccordionTrigger className="text-xs text-muted-foreground hover:text-foreground py-1">
                                                <span className="flex items-center gap-1">
                                                    <Lightbulb className="h-3 w-3" />
                                                    Formuleringsförslag
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <ul className="list-disc list-inside space-y-1 text-sm pl-2">
                                                    {CONVERSATION_TEMPLATES.assessment_intro.map((template, idx) => (
                                                        <li key={idx} className="text-muted-foreground">{template}</li>
                                                    ))}
                                                </ul>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            </div>
                        </div>

                        {/* Step 4: Summera arbetsinsats */}
                        <div className="border rounded-lg">
                            <div className="flex items-start gap-3 p-3">
                                <Checkbox
                                    id="step-3"
                                    checked={checkedSteps['step-3'] || false}
                                    onCheckedChange={() => toggleStep('step-3')}
                                    className="mt-1"
                                />
                                <Label htmlFor="step-3" className="cursor-pointer flex-1 font-medium">
                                    <div className={checkedSteps['step-3'] ? 'line-through text-muted-foreground' : ''}>
                                        4. Summera din bild av medarbetarens arbetsinsats utifrån bedömningsgrunderna. Använd så konkreta exempel som möjligt. Lyft gärna exempel på hur personen har bidragit till verksamheten och vad medarbetaren behöver göra mer. Tycker medarbetaren att din bild stämmer?
                                    </div>
                                </Label>
                            </div>
                        </div>

                        {/* Step 5: Presentera lön */}
                        <div className="border rounded-lg">
                            <div className="flex items-start gap-3 p-3">
                                <Checkbox
                                    id="step-4"
                                    checked={checkedSteps['step-4'] || false}
                                    onCheckedChange={() => toggleStep('step-4')}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <Label htmlFor="step-4" className="cursor-pointer font-medium">
                                        <div className={checkedSteps['step-4'] ? 'line-through text-muted-foreground' : ''}>
                                            5. Berätta hur du gjort din värdering och lönesättning samt presentera den nya lönen. Fokusera på den nya lönen och inte på påslaget eller höjningen.
                                        </div>
                                    </Label>

                                    {/* Salary view button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-2"
                                        onClick={() => window.open(
                                            `/salary-review/employees/${employee.id}/meeting/salary-view`,
                                            'salary',
                                            'width=1000,height=600'
                                        )}
                                    >
                                        <Monitor className="mr-2 h-4 w-4" />
                                        Visa löneförslag för medarbetaren
                                    </Button>

                                    <Accordion type="single" collapsible className="w-full mt-2">
                                        <AccordionItem value="suggestions-4" className="border-none">
                                            <AccordionTrigger className="text-xs text-muted-foreground hover:text-foreground py-1">
                                                <span className="flex items-center gap-1">
                                                    <Lightbulb className="h-3 w-3" />
                                                    Formuleringsförslag
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <ul className="list-disc list-inside space-y-1 text-sm pl-2">
                                                    {CONVERSATION_TEMPLATES.salary_presentation.map((template, idx) => (
                                                        <li key={idx} className="text-muted-foreground italic">{template}</li>
                                                    ))}
                                                </ul>
                                                <Alert className="mt-3">
                                                    <AlertDescription className="text-xs">
                                                        💡 <strong>Tips:</strong> Fokusera på den nya lönen, inte på påslaget eller höjningen.
                                                    </AlertDescription>
                                                </Alert>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            </div>
                        </div>

                        {/* Step 6: Framtida utveckling */}
                        <div className="border rounded-lg">
                            <div className="flex items-start gap-3 p-3">
                                <Checkbox
                                    id="step-5"
                                    checked={checkedSteps['step-5'] || false}
                                    onCheckedChange={() => toggleStep('step-5')}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <Label htmlFor="step-5" className="cursor-pointer font-medium">
                                        <div className={checkedSteps['step-5'] ? 'line-through text-muted-foreground' : ''}>
                                            6. Berätta hur medarbetaren ska kunna påverka sin löneutveckling framöver.
                                        </div>
                                    </Label>
                                    <Accordion type="single" collapsible className="w-full mt-2">
                                        <AccordionItem value="suggestions-5" className="border-none">
                                            <AccordionTrigger className="text-xs text-muted-foreground hover:text-foreground py-1">
                                                <span className="flex items-center gap-1">
                                                    <Lightbulb className="h-3 w-3" />
                                                    Formuleringsförslag
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <ul className="list-disc list-inside space-y-1 text-sm pl-2">
                                                    {CONVERSATION_TEMPLATES.future_development.map((template, idx) => (
                                                        <li key={idx} className="text-muted-foreground">{template}</li>
                                                    ))}
                                                </ul>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            </div>
                        </div>

                        {/* Step 7: Dokumentera */}
                        <div className="border rounded-lg">
                            <div className="flex items-start gap-3 p-3">
                                <Checkbox
                                    id="step-6"
                                    checked={checkedSteps['step-6'] || false}
                                    onCheckedChange={() => toggleStep('step-6')}
                                    className="mt-1"
                                />
                                <Label htmlFor="step-6" className="cursor-pointer flex-1 font-medium">
                                    <div className={checkedSteps['step-6'] ? 'line-through text-muted-foreground' : ''}>
                                        7. Skriv ner och dokumentera punkter som ni ska ta med er till kommande medarbetar-/utvecklingssamtal.
                                    </div>
                                </Label>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Criteria Examples */}
            <Card>
                <CardHeader>
                    <CardTitle>Konkreta exempel från bedömningar</CardTitle>
                    <CardDescription>
                        Använd dessa för att motivera din bedömning
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {SALARY_CRITERIA.map((category) => {
                            const categoryAssessments = criteriaAssessments.filter(
                                a => a.criterion_key === category.id
                            )

                            if (categoryAssessments.length === 0) return null

                            return (
                                <AccordionItem key={category.id} value={category.id}>
                                    <AccordionTrigger>
                                        {category.category_number}. {category.name}
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-3">
                                            {categoryAssessments.map((assessment) => {
                                                const subCriterion = category.subcriteria.find(
                                                    s => s.id === assessment.sub_criterion_key
                                                )
                                                return (
                                                    <div key={assessment.id} className="border-l-2 border-gray-300 pl-3">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge
                                                                variant="outline"
                                                                className={RATING_COLORS[assessment.rating as keyof typeof RATING_COLORS]}
                                                            >
                                                                {RATING_DISPLAY_NAMES[assessment.rating as keyof typeof RATING_DISPLAY_NAMES]}
                                                            </Badge>
                                                            <span className="text-sm font-medium">{subCriterion?.text}</span>
                                                        </div>
                                                        {assessment.evidence && (
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                {assessment.evidence}
                                                            </p>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    )
}
