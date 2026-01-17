'use client'

// Förberedelsefas för lönesamtal
// Används för att samla dokumentation och förbereda sig inför samtalet

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, Info } from 'lucide-react'
import { MEETING_PREPARATION, IMPORTANT_DOCUMENTS } from '@/lib/salary-review/meeting-guide'
import type { EmployeeCategory } from '@/lib/salary-review/types'

const preparationSchema = z.object({
    previous_agreements: z.string().optional(),
    goals_achieved: z.boolean().optional(),
    contribution_summary: z.string().optional(),
    development_needs: z.string().optional(),
    strengths_summary: z.string().optional()
})

type PreparationFormData = z.infer<typeof preparationSchema>

interface MeetingPreparationFormProps {
    reviewId: string
    employeeCategory: EmployeeCategory
    currentSalary?: number
    initialData: any
}

export default function MeetingPreparationForm({
    reviewId,
    employeeCategory,
    currentSalary,
    initialData
}: MeetingPreparationFormProps) {
    const [isSaving, setIsSaving] = useState(false)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PreparationFormData>({
        resolver: zodResolver(preparationSchema),
        defaultValues: {
            previous_agreements: initialData?.previous_agreements || '',
            goals_achieved: initialData?.goals_achieved || false,
            contribution_summary: initialData?.contribution_summary || '',
            development_needs: initialData?.development_needs || '',
            strengths_summary: initialData?.strengths_summary || ''
        }
    })

    const goalsAchieved = watch('goals_achieved')

    // Auto-save with debounce
    useEffect(() => {
        const subscription = watch((value) => {
            const timer = setTimeout(() => {
                handleSave(value as PreparationFormData)
            }, 2000)

            return () => clearTimeout(timer)
        })

        return () => subscription.unsubscribe()
    }, [watch])

    const handleSave = async (data: PreparationFormData) => {
        setIsSaving(true)
        setSaveStatus('saving')

        try {
            const response = await fetch(`/api/salary-review/reviews/${reviewId}/meeting-preparation`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })

            if (!response.ok) {
                throw new Error('Failed to save preparation')
            }

            setSaveStatus('saved')
            setTimeout(() => setSaveStatus('idle'), 2000)
        } catch (error) {
            console.error('Error saving preparation:', error)
            setSaveStatus('error')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Guide Info */}
            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    <div className="space-y-2">
                        <p className="font-medium">{MEETING_PREPARATION.description}</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            {MEETING_PREPARATION.steps.map((step, index) => (
                                <li key={index}>{step}</li>
                            ))}
                        </ul>
                    </div>
                </AlertDescription>
            </Alert>

            {/* Important Documents */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-medium mb-2">Viktiga dokument att ha tillgängliga:</h3>
                <ul className="space-y-1">
                    {IMPORTANT_DOCUMENTS.map((doc, index) => (
                        <li key={index} className="text-sm">
                            <span className="font-medium">{doc.title}</span>
                            <span className="text-muted-foreground"> - {doc.description}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Form */}
            <form className="space-y-6">
                {/* Previous Agreements */}
                <div className="space-y-2">
                    <Label htmlFor="previous_agreements">
                        Tidigare överenskommelser och uppföljning
                    </Label>
                    <Textarea
                        id="previous_agreements"
                        placeholder="Vad kom ni överens om vid tidigare samtal? Har målen uppnåtts?"
                        rows={4}
                        {...register('previous_agreements')}
                    />
                    <p className="text-sm text-muted-foreground">
                        Använd tidigare dokumentation från lönesamtal och utvecklingsplaner
                    </p>
                </div>

                {/* Goals Achieved */}
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="goals_achieved"
                        checked={goalsAchieved}
                        onCheckedChange={(checked) => setValue('goals_achieved', checked as boolean)}
                    />
                    <Label htmlFor="goals_achieved" className="cursor-pointer">
                        Medarbetaren har uppnått de uppsatta målen
                    </Label>
                </div>

                {/* Contribution Summary */}
                <div className="space-y-2">
                    <Label htmlFor="contribution_summary">
                        Hur har medarbetaren bidragit till verksamheten?
                    </Label>
                    <Textarea
                        id="contribution_summary"
                        placeholder="Beskriv konkreta exempel på hur medarbetaren har bidragit..."
                        rows={4}
                        {...register('contribution_summary')}
                    />
                </div>

                {/* Strengths */}
                <div className="space-y-2">
                    <Label htmlFor="strengths_summary">Styrkor</Label>
                    <Textarea
                        id="strengths_summary"
                        placeholder="Vad är medarbetarens styrkor?"
                        rows={3}
                        {...register('strengths_summary')}
                    />
                </div>

                {/* Development Needs */}
                <div className="space-y-2">
                    <Label htmlFor="development_needs">Utvecklingsområden</Label>
                    <Textarea
                        id="development_needs"
                        placeholder="Vilka områden behöver medarbetaren utveckla?"
                        rows={3}
                        {...register('development_needs')}
                    />
                </div>

                {/* Save Status */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
                        {saveStatus === 'saving' && (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                <span className="text-sm text-muted-foreground">Sparar...</span>
                            </>
                        )}
                        {saveStatus === 'saved' && (
                            <>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span className="text-sm text-green-600">Sparat!</span>
                            </>
                        )}
                        {saveStatus === 'error' && (
                            <span className="text-sm text-red-600">Kunde inte spara. Försök igen.</span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Dina ändringar sparas automatiskt
                    </p>
                </div>
            </form>
        </div>
    )
}
