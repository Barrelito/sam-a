'use client'

// Delad bekräftelsedialog för att ta bort en medarbetare.

import { useEffect, useState } from 'react'
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
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DeleteEmployeeDialogProps {
    employee: { id: string; first_name: string; last_name: string }
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
    /** API-bas att radera mot. Default: /api/employees */
    endpoint?: string
    onDeleted?: (employeeId: string) => void
}

export function DeleteEmployeeDialog({
    employee,
    open: controlledOpen,
    onOpenChange,
    trigger,
    endpoint = '/api/employees',
    onDeleted,
}: DeleteEmployeeDialogProps) {
    const { toast } = useToast()
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
    const open = controlledOpen ?? uncontrolledOpen
    const setOpen = (value: boolean) => {
        if (onOpenChange) onOpenChange(value)
        else setUncontrolledOpen(value)
    }

    const [loading, setLoading] = useState(false)
    const [confirmed, setConfirmed] = useState(false)

    useEffect(() => {
        if (open) setConfirmed(false)
    }, [open])

    const handleDelete = async () => {
        if (!confirmed) return

        setLoading(true)
        try {
            const response = await fetch(`${endpoint}/${employee.id}`, { method: 'DELETE' })
            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                throw new Error(data?.error || 'Kunde inte ta bort medarbetaren')
            }

            toast({
                title: 'Medarbetare borttagen',
                description: `${employee.first_name} ${employee.last_name} har raderats permanent.`,
            })

            setOpen(false)
            onDeleted?.(employee.id)
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Något gick fel',
                description: error instanceof Error ? error.message : 'Kunde inte ta bort medarbetaren',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
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
                        <p className="font-semibold">Följande data raderas permanent:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Medarbetarens grunduppgifter</li>
                            <li>Hela loggboken/personakten</li>
                            <li>Alla löneöversyner (alla år)</li>
                            <li>Alla bedömningar av lönekriterier och särskild yrkesskicklighet</li>
                            <li>Alla lönesamtal och anteckningar</li>
                        </ul>
                        <p className="font-semibold mt-3">
                            Använd endast om medarbetaren registrerats av misstag. Vid avslutad
                            anställning bör uppgifterna behållas för historiken.
                        </p>
                    </AlertDescription>
                </Alert>

                <div className="flex items-start space-x-2 py-2">
                    <Checkbox
                        id={`confirm-delete-${employee.id}`}
                        checked={confirmed}
                        onCheckedChange={(checked) => setConfirmed(checked === true)}
                    />
                    <label
                        htmlFor={`confirm-delete-${employee.id}`}
                        className="text-sm font-medium leading-snug"
                    >
                        Jag förstår att åtgärden är permanent och bekräftar att jag vill ta bort{' '}
                        {employee.first_name} {employee.last_name}.
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
                        {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        {loading ? 'Raderar...' : 'Ta bort permanent'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default DeleteEmployeeDialog
