'use client'

// Förberedelsefas för lönesamtal
// Används för att samla dokumentation och förbereda sig inför samtalet

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, Info, Save } from 'lucide-react'
import { MEETING_PREPARATION, IMPORTANT_DOCUMENTS } from '@/lib/salary-review/meeting-guide'

const preparationSchema = z.object({
    previous_agreements: z.string().optional(),
    goals_achieved: z.boolean().optional(),
    contribution_summary: z.string().optional(),
    development_needs: z.string().optional(),
    strengths_summary: z.string().optional()
})

type PreparationFormData = z.infer<typeof preparationSchema>

// Typdefinition för initialData
interface MeetingPreparationData {
    previous_agreements?: string
    goals_achieved?: boolean
    contribution_summary?: string
    development_needs?: string
    strengths_summary?: string
}

interface MeetingPreparationFormProps {
    reviewId: string
    employeeCategory?: string // Behålls för bakåtkompatibilitet men används inte
    currentSalary?: number // Behålls för bakåtkompatibilitet men används inte
    initialData: MeetingPreparationData | null
}

export default function MeetingPreparationForm({
    reviewId,
    initialData
}: MeetingPreparationFormProps) {
    const router = useRouter()
    const [isSaving, setIsSaving] = useState(false)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PreparationFormData>({
        resolver: zodResolver(preparationSchema),
        defaultValues: {
            previous_agreements: initialData?.previous_agreements ?? '',
            goals_achieved: initialData?.goals_achieved ?? false,
            contribution_summary: initialData?.contribution_summary ?? '',
            development_needs: initialData?.development_needs ?? '',
            strengths_summary: initialData?.strengths_summary ?? ''
        }
    })

    const goalsAchieved = watch('goals_achieved')

    const onSubmit = async (data: PreparationFormData) => {
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
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to save preparation')
            }

            setSaveStatus('saved')

            // Refresh page data silently
            router.refresh()

            setTimeout(() => setSaveStatus('idle'), 3000)
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Previous Agreements - använder register() korrekt */}
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

                {/* Goals Achieved - Checkbox kräver fortfarande manuell hantering med shadcn */}
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="goals_achieved"
                        checked={goalsAchieved}
                        onCheckedChange={(checked) => setValue('goals_achieved', checked as boolean, { shouldDirty: true })}
                    />
                    <Label htmlFor="goals_achieved" className="cursor-pointer">
                        Medarbetaren har uppnått de uppsatta målen
                    </Label>
                </div>

                {/* Contribution Summary - använder register() korrekt */}
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

                {/* Strengths - använder register() korrekt */}
                <div className="space-y-2">
                    <Label htmlFor="strengths_summary">Styrkor</Label>
                    <Textarea
                        id="strengths_summary"
                        placeholder="Vad är medarbetarens styrkor?"
                        rows={4}
                        {...register('strengths_summary')}
                    />
                </div>

                {/* Development Needs - använder register() korrekt */}
                <div className="space-y-2">
                    <Label htmlFor="development_needs">Utvecklingsområden</Label>
                    <Textarea
                        id="development_needs"
                        placeholder="Vad behöver medarbetaren utveckla?"
                        rows={4}
                        {...register('development_needs')}
                    />
                </div>

                {/* Save Button and Status */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
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
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Sparar...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Spara ändringar
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}

