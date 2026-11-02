'use client'

// Stäng vald löneöversyn. Bara admin och VO-chef ser knappen, eftersom
// stängningen påverkar alla stationer (ADR 0004).

import { useState } from 'react'
import { Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

interface CloseCycleButtonProps {
    cycleId: string
    year: number
    /** Lönesättningar i löneöversynen som inte är klara */
    unfinishedCount: number
}

export default function CloseCycleButton({ cycleId, year, unfinishedCount }: CloseCycleButtonProps) {
    const [closing, setClosing] = useState(false)
    const { toast } = useToast()

    const close = async () => {
        setClosing(true)
        try {
            const response = await fetch(`/api/salary-review/cycles/${cycleId}/close`, { method: 'POST' })
            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.error || 'Kunde inte stänga löneöversynen')
            }
            window.location.reload()
        } catch (error) {
            toast({
                title: 'Fel',
                description: error instanceof Error ? error.message : 'Kunde inte stänga löneöversynen',
                variant: 'destructive',
            })
            setClosing(false)
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={closing}>
                    {closing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                    Stäng löneöversyn {year}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Stäng löneöversyn {year}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {unfinishedCount > 0
                            ? `${unfinishedCount} lönesättningar är inte klara. `
                            : 'Alla lönesättningar är klara. '}
                        När löneöversynen är stängd kan ingen station ändra något i den. Den går
                        fortfarande att öppna och läsa.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                    <AlertDialogAction onClick={close}>Stäng löneöversyn {year}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
