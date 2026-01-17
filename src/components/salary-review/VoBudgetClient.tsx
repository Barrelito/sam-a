'use client'

// VO Budget Management Client Component
// Hantering av total budget och fördelning till stationer

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, DollarSign, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { LoadingButton } from '@/components/ui/loading-button'

interface VoBudgetClientProps {
    vo: any
    cycle: any
    stations: Array<{ id: string; name: string }>
}

export default function VoBudgetClient({ vo, cycle, stations }: VoBudgetClientProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [totalBudget, setTotalBudget] = useState('')
    const [budgetId, setBudgetId] = useState<string | null>(null)
    const [allocations, setAllocations] = useState<Record<string, { amount: string; notes: string }>>({})

    // Load existing budget
    useEffect(() => {
        async function loadBudget() {
            try {
                const response = await fetch(`/api/salary-review/vo-budgets?cycle_id=${cycle.id}`)
                const data = await response.json()

                if (data.budget) {
                    setTotalBudget(data.budget.total_budget)
                    setBudgetId(data.budget.id)

                    // Load allocations
                    if (data.budget.allocations) {
                        const allocMap: Record<string, { amount: string; notes: string }> = {}
                        data.budget.allocations.forEach((alloc: any) => {
                            allocMap[alloc.station_id] = {
                                amount: alloc.allocated_amount,
                                notes: alloc.notes || ''
                            }
                        })
                        setAllocations(allocMap)
                    }
                }
            } catch (error) {
                console.error('Error loading budget:', error)
                toast({
                    variant: "destructive",
                    title: "Fel vid laddning",
                    description: "Kunde inte ladda budget. Försök igen."
                })
            } finally {
                setLoading(false)
            }
        }

        loadBudget()
    }, [cycle.id, toast])

    const handleSaveTotalBudget = async () => {
        if (!totalBudget || parseFloat(totalBudget) < 0) {
            toast({
                variant: "destructive",
                title: "Ogiltig budget",
                description: "Ange en giltig budget (>= 0)"
            })
            return
        }

        setSaving(true)
        try {
            const response = await fetch('/api/salary-review/vo-budgets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cycle_id: cycle.id,
                    total_budget: parseFloat(totalBudget)
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save budget')
            }

            setBudgetId(data.budget.id)
            toast({
                title: "✓ Budget sparad!",
                description: `Total budget: ${parseFloat(totalBudget).toLocaleString('sv-SE')} kr`
            })

            router.refresh()
        } catch (error) {
            console.error('Error saving budget:', error)
            toast({
                variant: "destructive",
                title: "Fel vid sparande",
                description: error instanceof Error ? error.message : 'Kunde inte spara budget'
            })
        } finally {
            setSaving(false)
        }
    }

    const handleAllocationChange = (stationId: string, field: 'amount' | 'notes', value: string) => {
        setAllocations(prev => ({
            ...prev,
            [stationId]: {
                ...prev[stationId],
                [field]: value
            }
        }))
    }

    const handleSaveAllocations = async () => {
        if (!budgetId) {
            toast({
                variant: "destructive",
                title: "Ingen budget satt",
                description: "Du måste först sätta en total budget"
            })
            return
        }

        // Calculate total allocation
        const totalAllocated = Object.values(allocations).reduce((sum, alloc) =>
            sum + (parseFloat(alloc.amount) || 0), 0)

        if (totalAllocated > parseFloat(totalBudget)) {
            toast({
                variant: "destructive",
                title: "Överfördelning",
                description: `Total fördelning (${totalAllocated.toLocaleString('sv-SE')} kr) överstiger budgeten (${parseFloat(totalBudget).toLocaleString('sv-SE')} kr)`
            })
            return
        }

        setSaving(true)
        try {
            const allocationArray = Object.entries(allocations)
                .filter(([_, alloc]) => alloc.amount && parseFloat(alloc.amount) > 0)
                .map(([stationId, alloc]) => ({
                    station_id: stationId,
                    allocated_amount: parseFloat(alloc.amount),
                    notes: alloc.notes
                }))

            const response = await fetch('/api/salary-review/station-allocations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vo_cycle_budget_id: budgetId,
                    allocations: allocationArray
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save allocations')
            }

            toast({
                title: "✓ Fördelning sparad!",
                description: `${allocationArray.length} stationer tilldelade budget`
            })

            router.refresh()
        } catch (error) {
            console.error('Error saving allocations:', error)
            toast({
                variant: "destructive",
                title: "Fel vid sparande",
                description: error instanceof Error ? error.message : 'Kunde inte spara fördelning'
            })
        } finally {
            setSaving(false)
        }
    }

    const totalAllocated = Object.values(allocations).reduce((sum, alloc) =>
        sum + (parseFloat(alloc.amount) || 0), 0)
    const remaining = parseFloat(totalBudget || '0') - totalAllocated

    if (loading) {
        return <div className="container mx-auto py-8">Laddar...</div>
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <Link href="/salary-review">
                <Button variant="ghost" className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tillbaka till översikt
                </Button>
            </Link>

            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Budgethantering</h1>
                <p className="text-muted-foreground">
                    {vo.name} - Löneöversyn {cycle.year}
                </p>
            </div>

            {/* Set Total Budget */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Total Budget
                    </CardTitle>
                    <CardDescription>
                        Ange den totala budgeten för ditt VO-område
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="total-budget">Total Budget (kr)</Label>
                            <Input
                                id="total-budget"
                                type="number"
                                min="0"
                                step="1000"
                                value={totalBudget}
                                onChange={(e) => setTotalBudget(e.target.value)}
                                placeholder="t.ex. 500000"
                                className="mt-1"
                            />
                        </div>
                        <LoadingButton
                            onClick={handleSaveTotalBudget}
                            isLoading={saving}
                            disabled={!totalBudget}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            Spara Total Budget
                        </LoadingButton>
                    </div>
                </CardContent>
            </Card>

            {/* Budget Summary */}
            {totalBudget && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Budgetöversikt</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Budget</p>
                                <p className="text-2xl font-bold">{parseFloat(totalBudget).toLocaleString('sv-SE')} kr</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Fördelat</p>
                                <p className="text-2xl font-bold text-blue-600">{totalAllocated.toLocaleString('sv-SE')} kr</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Återstår</p>
                                <p className={`text-2xl font-bold ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {remaining.toLocaleString('sv-SE')} kr
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Allocate to Stations */}
            {budgetId && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Fördela Budget till Stationer
                        </CardTitle>
                        <CardDescription>
                            Fördela budgeten mellan dina {stations.length} stationer
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {stations.map((station) => (
                                <div key={station.id} className="border rounded-lg p-4 space-y-3">
                                    <h3 className="font-medium">{station.name}</h3>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <Label htmlFor={`amount-${station.id}`}>Tilldelad Budget (kr)</Label>
                                            <Input
                                                id={`amount-${station.id}`}
                                                type="number"
                                                min="0"
                                                step="1000"
                                                value={allocations[station.id]?.amount || ''}
                                                onChange={(e) => handleAllocationChange(station.id, 'amount', e.target.value)}
                                                placeholder="0"
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor={`notes-${station.id}`}>Anteckningar (valfritt)</Label>
                                            <Textarea
                                                id={`notes-${station.id}`}
                                                value={allocations[station.id]?.notes || ''}
                                                onChange={(e) => handleAllocationChange(station.id, 'notes', e.target.value)}
                                                placeholder="T.ex. antal medarbetare, särskilda behov..."
                                                rows={2}
                                                className="mt-1 resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <LoadingButton
                                onClick={handleSaveAllocations}
                                isLoading={saving}
                                className="w-full"
                                disabled={totalAllocated > parseFloat(totalBudget || '0')}
                            >
                                <Save className="mr-2 h-4 w-4" />
                                Spara Fördelning
                            </LoadingButton>

                            {totalAllocated > parseFloat(totalBudget || '0') && (
                                <p className="text-sm text-red-600">
                                    ⚠️ Fördelningen överstiger den totala budgeten!
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
