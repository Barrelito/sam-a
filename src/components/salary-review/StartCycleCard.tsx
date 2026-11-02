'use client'

// Starta nästa års löneöversyn (ADR 0004). Löneöversynen gäller hela
// organisationen; den som startar först startar den för alla stationer.

import { useState } from 'react'
import { CalendarPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function StartCycleCard({ year }: { year: number }) {
    const [starting, setStarting] = useState(false)
    const { toast } = useToast()

    const start = async () => {
        setStarting(true)
        try {
            const response = await fetch('/api/salary-review/cycles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year }),
            })

            // 409: någon annan hann före – året finns, så gå dit ändå
            if (!response.ok && response.status !== 409) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.error || 'Kunde inte starta löneöversynen')
            }

            const params = new URLSearchParams({ year: String(year), next: '/salary-review' })
            window.location.href = `/api/salary-review/select-year?${params}`
        } catch (error) {
            toast({
                title: 'Fel',
                description: error instanceof Error ? error.message : 'Kunde inte starta löneöversynen',
                variant: 'destructive',
            })
            setStarting(false)
        }
    }

    return (
        <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                    <CalendarPlus className="h-6 w-6" />
                    Löneöversyn {year}
                </CardTitle>
                <CardDescription className="text-blue-700">
                    Löneöversynen {year} börjar med medarbetarsamtal. Den gäller alla stationer,
                    och pågående lönesamtal för tidigare år kan avslutas som vanligt.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button size="lg" onClick={start} disabled={starting} className="w-full md:w-auto">
                    {starting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CalendarPlus className="mr-2 h-5 w-5" />}
                    Starta löneöversyn {year}
                </Button>
            </CardContent>
        </Card>
    )
}
