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
import { CheckCircle2, Circle, Eye, Lightbulb, MessageSquare } from 'lucide-react'
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
                    {/* Numeric Overview with Average */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium">Bedömningsresultat - Numerisk skala</h4>
                            <Badge variant="outline" className="text-lg px-3 py-1">
                                Genomsnitt: {(() => {
                                    const ratings = criteriaAssessments.map(a => a.rating)
                                    const average = ratings.length > 0
                                        ? ratings.reduce((acc, rating) => acc + NUMERIC_RATING_VALUES[rating as keyof typeof NUMERIC_RATING_VALUES], 0) / ratings.length
                                        : 0
                                    return average.toFixed(2)
                                })()} / 5.0
                            </Badge>
                        </div>

                        {/* Rating Scale Guide */}
                        <div className="bg-gradient-to-r from-red-50 via-yellow-50 via-green-50 to-blue-50 p-4 rounded-lg border mb-4">
                            <div className="grid grid-cols-4 gap-2 text-center text-sm">
                                <div>
                                    <div className="font-bold text-2xl text-red-700">1</div>
                                    <div className="text-xs text-red-600">Behöver utvecklas</div>
                                </div>
                                <div>
                                    <div className="font-bold text-2xl text-yellow-700">3</div>
                                    <div className="text-xs text-yellow-600">Bra</div>
                                </div>
                                <div>
                                    <div className="font-bold text-2xl text-green-700">4</div>
                                    <div className="text-xs text-green-600">Mycket bra</div>
                                </div>
                                <div>
                                    <div className="font-bold text-2xl text-blue-700">5</div>
                                    <div className="text-xs text-blue-600">Utmärkt</div>
                                </div>
                            </div>
                        </div>

                        {/* Salary Guidance Helper */}
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-900">
                                <strong>Vägledning:</strong> Använd genomsnittet (1-5) för att beräkna löneökning.
                                <br />
                                Exempel: Genomsnitt 3.5 = X kronor, 4.0 = Y kronor, 4.5 = Z kronor
                            </p>
                        </div>
                    </div>

                    {/* Particularly Skillful - Button to open dialog */}
                    {particularlySkillfulAssessments && particularlySkillfulAssessments.length > 0 && (
                        <div className="pt-4 border-t">
                            <div className="flex items-center justify-between p-4 border-2 border-green-200 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                                <div className="flex-1">
                                    <h4 className="font-medium mb-1">Särskild yrkesskicklighet</h4>
                                    <div className="flex items-center gap-2">
                                        {particularlySkillfulMet > 0 && (
                                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                                                {particularlySkillfulMet} av {particularlySkillfulTotal} uppfyllda
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

            {/* Meeting Structure Checklist */}
            <Card>
                <CardHeader>
                    <CardTitle>Samtalsstruktur</CardTitle>
                    <CardDescription>
                        Följ dessa steg under lönesamtalet
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {MEETING_STRUCTURE.steps.map((step, index) => {
                            const stepId = `step-${index}`
                            return (
                                <div key={stepId} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                                    <Checkbox
                                        id={stepId}
                                        checked={checkedSteps[stepId] || false}
                                        onCheckedChange={() => toggleStep(stepId)}
                                        className="mt-1"
                                    />
                                    <Label htmlFor={stepId} className="cursor-pointer flex-1">
                                        <div className={checkedSteps[stepId] ? 'line-through text-muted-foreground' : ''}>
                                            {step}
                                        </div>
                                    </Label>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Conversation Templates */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5" />
                        Formuleringsförslag
                    </CardTitle>
                    <CardDescription>
                        Förslag på hur du kan formulera dig under samtalet
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="opening">
                            <AccordionTrigger>Inledning av samtalet</AccordionTrigger>
                            <AccordionContent>
                                <ul className="list-disc list-inside space-y-2">
                                    {CONVERSATION_TEMPLATES.opening.map((template, index) => (
                                        <li key={index} className="text-sm">{template}</li>
                                    ))}
                                </ul>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="assessment">
                            <AccordionTrigger>Presentera bedömning</AccordionTrigger>
                            <AccordionContent>
                                <ul className="list-disc list-inside space-y-2">
                                    {CONVERSATION_TEMPLATES.assessment_intro.map((template, index) => (
                                        <li key={index} className="text-sm">{template}</li>
                                    ))}
                                </ul>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="salary">
                            <AccordionTrigger>Presentera lön</AccordionTrigger>
                            <AccordionContent>
                                <ul className="list-disc list-inside space-y-2">
                                    {CONVERSATION_TEMPLATES.salary_presentation.map((template, index) => (
                                        <li key={index} className="text-sm italic">{template}</li>
                                    ))}
                                </ul>
                                <Alert className="mt-4">
                                    <AlertDescription className="text-sm">
                                        💡 <strong>Tips:</strong> Fokusera på den nya lönen, inte på påslaget eller höjningen.
                                    </AlertDescription>
                                </Alert>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="development">
                            <AccordionTrigger>Framtida utveckling</AccordionTrigger>
                            <AccordionContent>
                                <ul className="list-disc list-inside space-y-2">
                                    {CONVERSATION_TEMPLATES.future_development.map((template, index) => (
                                        <li key={index} className="text-sm">{template}</li>
                                    ))}
                                </ul>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
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
