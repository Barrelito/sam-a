'use client'

// Dokumentationsformulär för lönesamtal
// Används för att spara slutlig lön och slutföra löneöversynen

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import type { EmployeeWithDetails } from '@/lib/salary-review/types'

const documentationSchema = z.object({
    proposed_salary: z.number().optional(),
    final_salary: z.number({ required_error: 'Slutlig lön måste anges' }).positive('Lön måste vara positiv'),
    meeting_date: z.string({ required_error: 'Mötesdatum måste anges' }),
    meeting_notes: z.string().optional()
})

type DocumentationFormData = z.infer<typeof documentationSchema>

interface MeetingDocumentationFormProps {
    reviewId: string
    employee: EmployeeWithDetails
    currentSalary?: number
    initialData: {
        proposed_salary?: number
        final_salary?: number
        meeting_date?: string
        meeting_notes?: string
    }
}

export default function MeetingDocumentationForm({
    reviewId,
    employee,
    currentSalary,
    initialData
}: MeetingDocumentationFormProps) {
    const router = useRouter()
    const [isSaving, setIsSaving] = useState(false)
    const [showCompleteDialog, setShowCompleteDialog] = useState(false)

    const { register, handleSubmit, watch, formState: { errors } } = useForm<DocumentationFormData>({
        resolver: zodResolver(documentationSchema),
        defaultValues: {
            proposed_salary: initialData?.proposed_salary,
            final_salary: initialData?.final_salary,
            meeting_date: initialData?.meeting_date || new Date().toISOString().split('T')[0],
            meeting_notes: initialData?.meeting_notes || ''
        }
    })

    const finalSalary = watch('final_salary')

    // Räkna ut ökning
    const salaryIncrease = currentSalary && finalSalary ? finalSalary - currentSalary : 0
    const salaryIncreasePercent = currentSalary && finalSalary ? ((finalSalary - currentSalary) / currentSalary) * 100 : 0

    const onSave = async (data: DocumentationFormData) => {
        setIsSaving(true)

        try {
            const response = await fetch(`/api/salary-review/reviews/${reviewId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...data,
                    status: 'in_progress' // Spara utan att slutföra
                })
            })

            if (!response.ok) {
                throw new Error('Failed to save documentation')
            }

            alert('Dokumentation sparad!')
        } catch (error) {
            console.error('Error saving documentation:', error)
            alert('Kunde inte spara. Försök igen.')
        } finally {
            setIsSaving(false)
        }
    }

    const onComplete = async (data: DocumentationFormData) => {
        setIsSaving(true)

        try {
            const response = await fetch(`/api/salary-review/reviews/${reviewId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...data,
                    status: 'completed' // Slutför review
                })
            })

            if (!response.ok) {
                throw new Error('Failed to complete review')
            }

            // Navigera tillbaka till medarbetaröversikten
            router.push(`/salary-review/employees/${employee.id}`)
            router.refresh()
        } catch (error) {
            console.error('Error completing review:', error)
            alert('Kunde inte slutföra. Försök igen.')
        } finally {
            setIsSaving(false)
            setShowCompleteDialog(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Info */}
            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    Dokumentera resultatet från lönesamtalet. När du är klar, slutför löneöversynen genom att klicka på "Slutför löneöversyn" längst ned.
                </AlertDescription>
            </Alert>

            {/* Current Salary Reference */}
            {currentSalary && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Nuvarande lön:</span>
                        <span className="text-lg font-bold">{currentSalary.toLocaleString('sv-SE')} kr/mån</span>
                    </div>
                </div>
            )}

            {/* Form */}
            <form className="space-y-6">
                {/* Proposed Salary (optional) */}
                <div className="space-y-2">
                    <Label htmlFor="proposed_salary">
                        Föreslagen lön (optional)
                    </Label>
                    <Input
                        id="proposed_salary"
                        type="number"
                        placeholder="35000"
                        {...register('proposed_salary', { valueAsNumber: true })}
                    />
                    <p className="text-sm text-muted-foreground">
                        Din ursprungliga löneförslag innan eventuell dialog
                    </p>
                </div>

                {/* Final Salary (required) */}
                <div className="space-y-2">
                    <Label htmlFor="final_salary" className="text-red-600">
                        Slutlig lön *
                    </Label>
                    <Input
                        id="final_salary"
                        type="number"
                        placeholder="36000"
                        {...register('final_salary', { valueAsNumber: true })}
                        className={errors.final_salary ? 'border-red-500' : ''}
                    />
                    {errors.final_salary && (
                        <p className="text-sm text-red-600">{errors.final_salary.message}</p>
                    )}

                    {/* Salary Increase Display */}
                    {finalSalary && currentSalary && (
                        <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Löneökning:</span>
                                <div className="text-right">
                                    <div className="font-bold text-lg text-green-700">
                                        +{salaryIncrease.toLocaleString('sv-SE')} kr/mån
                                    </div>
                                    <div className="text-sm text-green-600">
                                        +{salaryIncreasePercent.toFixed(2)}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Warning for unusual increases */}
                    {finalSalary && currentSalary && salaryIncreasePercent > 10 && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                Löneökningen är ovanligt hög ({salaryIncreasePercent.toFixed(2)}%). Dubbelkolla att du angett rätt belopp.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                {/* Meeting Date */}
                <div className="space-y-2">
                    <Label htmlFor="meeting_date" className="text-red-600">
                        Mötesdatum *
                    </Label>
                    <Input
                        id="meeting_date"
                        type="date"
                        {...register('meeting_date')}
                        className={errors.meeting_date ? 'border-red-500' : ''}
                    />
                    {errors.meeting_date && (
                        <p className="text-sm text-red-600">{errors.meeting_date.message}</p>
                    )}
                </div>

                {/* Meeting Notes */}
                <div className="space-y-2">
                    <Label htmlFor="meeting_notes">
                        Samtalets huvudpunkter och överenskommelser
                    </Label>
                    <Textarea
                        id="meeting_notes"
                        placeholder="Vad diskuterades? Vad kom ni överens om för nästa år?"
                        rows={6}
                        {...register('meeting_notes')}
                    />
                    <p className="text-sm text-muted-foreground">
                        Dokumentera viktiga punkter, överenskommelser och vad medarbetaren ska fokusera på framöver
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleSubmit(onSave)}
                        disabled={isSaving}
                    >
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Spara utkast
                    </Button>

                    <Button
                        type="button"
                        onClick={handleSubmit(() => setShowCompleteDialog(true))}
                        disabled={isSaving}
                        className="ml-auto"
                    >
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Slutför löneöversyn
                    </Button>
                </div>
            </form>

            {/* Completion Confirmation Dialog */}
            <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Slutför löneöversyn?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Du är på väg att slutföra löneöversynen för {employee.first_name} {employee.last_name}.
                            <br /><br />
                            <strong>Slutlig lön:</strong> {finalSalary?.toLocaleString('sv-SE')} kr/mån
                            <br />
                            {currentSalary && (
                                <>
                                    <strong>Ökning:</strong> +{salaryIncrease.toLocaleString('sv-SE')} kr ({salaryIncreasePercent.toFixed(2)}%)
                                </>
                            )}
                            <br /><br />
                            När du slutför kommer löneöversynen att markeras som klar.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Avbryt</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSubmit(onComplete)}>
                            Ja, slutför
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
