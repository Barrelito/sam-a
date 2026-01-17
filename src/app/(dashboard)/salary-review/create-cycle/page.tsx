'use client'

// Enkel sida för att skapa en löneöversynscykel

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function CreateCyclePage() {
    const [loading, setLoading] = useState(false)
    const [currentYear, setCurrentYear] = useState<number | null>(null)
    const router = useRouter()

    useEffect(() => {
        setCurrentYear(new Date().getFullYear())
    }, [])

    const handleCreateCycle = async () => {
        if (!currentYear) return

        setLoading(true)
        try {
            const response = await fetch('/api/salary-review/cycles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    year: currentYear,
                    description: `Löneöversyn ${currentYear}`,
                    status: 'active',
                    start_date: `${currentYear}-01-01`,
                    end_date: `${currentYear}-12-31`
                })
            })

            const data = await response.json()

            if (!response.ok) {
                if (response.status === 403) {
                    alert('Du har inte behörighet att skapa en cykel. Endast administratörer och VO-chefer kan göra detta.')
                } else {
                    alert(`Fel: ${data.error || 'Kunde inte skapa cykel'}`)
                }
                setLoading(false)
                return
            }

            alert(`Löneöversynscykel ${currentYear} har skapats!`)
            router.push('/salary-review')
            router.refresh()
        } catch (error) {
            console.error('Error:', error)
            alert(`Fel: ${error instanceof Error ? error.message : 'Kunde inte skapa cykel'}`)
            setLoading(false)
        }
    }

    if (!currentYear) {
        return <div className="container mx-auto py-8">Laddar...</div>
    }

    return (
        <div className="container mx-auto py-8 max-w-md">
            <Card>
                <CardHeader>
                    <CardTitle>Skapa Löneöversynscykel</CardTitle>
                    <CardDescription>
                        Skapa en ny aktiv löneöversynscykel för {currentYear}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleCreateCycle} disabled={loading} className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Skapa Cykel {currentYear}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
