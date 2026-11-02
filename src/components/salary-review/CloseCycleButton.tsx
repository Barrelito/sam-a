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
}

type Preview = { total: number; unfinished: number }

export default function CloseCycleButton({ cycleId, year }: CloseCycleButtonProps) {
    const [closing, setClosing] = useState(false)
    // Underlaget räknas över hela organisationen när dialogen öppnas
    const [preview, setPreview] = useState<Preview | null | 'error'>(null)
    const { toast } = useToast()

    const loadPreview = async (open: boolean) => {
        if (!open) return
        setPreview(null)
        try {
            const response = await fetch(`/api/salary-review/cycles/${cycleId}/close`)
            setPreview(response.ok ? await response.json() : 'error')
        } catch {
            setPreview('error')
        }
    }

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
        <AlertDialog onOpenChange={loadPreview}>
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
                        {preview === null && 'Räknar lönesättningar som inte är klara… '}
                        {preview === 'error' && 'Kunde inte räkna lönesättningar som inte är klara. '}
                        {preview && preview !== 'error' && (preview.unfinished > 0
                            ? `${preview.unfinished} av ${preview.total} medarbetare i hela organisationen har ingen klar lönesättning. `
                            : 'Alla medarbetare har en klar lönesättning. ')}
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
