'use client'

// DeleteEmployeeDialog - Dialog för att ta bort medarbetare med stark varning

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'

interface DeleteEmployeeDialogProps {
    employee: {
        id: string
        first_name: string
        last_name: string
    }
    trigger?: React.ReactNode // Optional custom trigger
    onDeleteSuccess?: () => void // Optional callback after successful delete
}

export default function DeleteEmployeeDialog({ employee, trigger, onDeleteSuccess }: DeleteEmployeeDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [confirmed, setConfirmed] = useState(false)
    const [reviewInfo, setReviewInfo] = useState<{
        hasActiveReview: boolean
        totalReviews: number
    } | null>(null)
    const router = useRouter()

    // Fetch review info when dialog opens
    const handleOpenChange = async (newOpen: boolean) => {
        setOpen(newOpen)
        if (newOpen) {
            setConfirmed(false)
            // Fetch review info
            try {
                const response = await fetch(`/api/salary-review/employees/${employee.id}`)
                if (response.ok) {
                    // We could add a specific endpoint to get review counts, 
                    // but for now we'll show the warning regardless
                    setReviewInfo({
                        hasActiveReview: false, // We'll show warning for all deletes
                        totalReviews: 0
                    })
                }
            } catch (error) {
                console.error('Error fetching review info:', error)
            }
        }
    }

    const handleDelete = async () => {
        if (!confirmed) {
            alert('Du måste bekräfta att du vill ta bort medarbetaren')
            return
        }

        setLoading(true)

        try {
            const response = await fetch(`/api/salary-review/employees/${employee.id}`, {
                method: 'DELETE',
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete employee')
            }

            alert(`Medarbetare raderad: ${employee.first_name} ${employee.last_name}`)
            setOpen(false)

            if (onDeleteSuccess) {
                onDeleteSuccess()
            } else {
                router.push('/salary-review/employees')
                router.refresh()
            }
        } catch (error) {
            console.error('Error deleting employee:', error)
            alert(`Fel: ${error instanceof Error ? error.message : 'Kunde inte ta bort medarbetare'}`)
        } finally {
            setLoading(false)
        }
    }

    const defaultTrigger = (
        <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Ta bort
        </Button>
    )

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Ta bort medarbetare
                    </DialogTitle>
                    <DialogDescription>
                        Du är på väg att permanent radera {employee.first_name} {employee.last_name}.
                        Denna åtgärd kan inte ångras.
                    </DialogDescription>
                </DialogHeader>

                <Alert variant="destructive" className="my-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>VARNING: Permanent borttagning</AlertTitle>
                    <AlertDescription className="mt-2 space-y-2">
                        <p className="font-semibold">Följande data kommer att raderas permanent:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Medarbetarens grunduppgifter</li>
                            <li>Alla löneöversyner (alla år)</li>
                            <li>Alla bedömningar av särskild yrkesskicklighet</li>
                            <li>Alla bedömningar av lönekriterier</li>
                            <li>Alla lönesamtal och anteckningar</li>
                            <li>All relaterad historisk data</li>
                        </ul>
                        <p className="font-semibold mt-3 text-destructive-foreground">
                            Denna funktion ska endast användas om medarbetaren registrerats av misstag.
                        </p>
                    </AlertDescription>
                </Alert>

                <div className="flex items-start space-x-2 py-4">
                    <Checkbox
                        id="confirm-delete"
                        checked={confirmed}
                        onCheckedChange={(checked) => setConfirmed(checked === true)}
                    />
                    <label
                        htmlFor="confirm-delete"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Jag förstår att denna åtgärd är permanent och att all data kommer att raderas.
                        Jag bekräftar att jag vill ta bort {employee.first_name} {employee.last_name}.
                    </label>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                        className="w-full sm:w-auto"
                    >
                        Avbryt
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={!confirmed || loading}
                        className="w-full sm:w-auto"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? 'Raderar...' : 'Ta bort permanent'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
