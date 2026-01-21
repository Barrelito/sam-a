'use client'

// VO Budget Management Client Component - Separerad per avtalsområde
// Vårdförbundet (SSK/VUB) och Kommunal (AMB)

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, Users, Briefcase, Award, TrendingUp, Info } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { LoadingButton } from '@/components/ui/loading-button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface VoBudgetClientProps {
    vo: any
    cycle: any
    stations: Array<{ id: string; name: string }>
}

interface UnionBudget {
    id?: string
    total_budget?: number
    extra_skilled_amount?: number
    guaranteed_per_employee?: number
    variable_budget?: number
    allocations?: Array<{
        station_id: string
        allocated_amount: number
        notes?: string
    }>
}

export default function VoBudgetClient({ vo, cycle, stations }: VoBudgetClientProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Vårdförbundet state
    const [vfBudget, setVfBudget] = useState<UnionBudget>({})
    const [vfAllocations, setVfAllocations] = useState<Record<string, { amount: string; notes: string }>>({})

    // Kommunal state
    const [komBudget, setKomBudget] = useState<UnionBudget>({})
    const [komAllocations, setKomAllocations] = useState<Record<string, { amount: string; notes: string }>>({})

    // Load existing budgets
    useEffect(() => {
        async function loadBudgets() {
            try {
                const response = await fetch(`/api/salary-review/union-budgets?cycle_id=${cycle.id}`)
                const data = await response.json()

                if (data.vardförbundet) {
                    setVfBudget({
                        id: data.vardförbundet.id,
                        total_budget: data.vardförbundet.total_budget,
                        extra_skilled_amount: data.vardförbundet.extra_skilled_amount
                    })
                    // Load allocations
                    if (data.vardförbundet.allocations) {
                        const allocMap: Record<string, { amount: string; notes: string }> = {}
                        data.vardförbundet.allocations.forEach((a: any) => {
                            allocMap[a.station_id] = {
                                amount: String(a.allocated_amount || ''),
                                notes: a.notes || ''
                            }
                        })
                        setVfAllocations(allocMap)
                    }
                }

                if (data.kommunal) {
                    setKomBudget({
                        id: data.kommunal.id,
                        guaranteed_per_employee: data.kommunal.guaranteed_per_employee,
                        variable_budget: data.kommunal.variable_budget
                    })
                    // Load allocations
                    if (data.kommunal.allocations) {
                        const allocMap: Record<string, { amount: string; notes: string }> = {}
                        data.kommunal.allocations.forEach((a: any) => {
                            allocMap[a.station_id] = {
                                amount: String(a.allocated_amount || ''),
                                notes: a.notes || ''
                            }
                        })
                        setKomAllocations(allocMap)
                    }
                }
            } catch (error) {
                console.error('Error loading budgets:', error)
                toast({
                    variant: "destructive",
                    title: "Fel vid laddning",
                    description: "Kunde inte ladda budgetar."
                })
            } finally {
                setLoading(false)
            }
        }

        loadBudgets()
    }, [cycle.id, toast])

    // Save Vårdförbundet budget
    const handleSaveVardförbundet = async () => {
        setSaving(true)
        try {
            const response = await fetch('/api/salary-review/union-budgets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cycle_id: cycle.id,
                    union_type: 'vardförbundet',
                    total_budget: vfBudget.total_budget,
                    extra_skilled_amount: vfBudget.extra_skilled_amount
                })
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.error)

            setVfBudget(prev => ({ ...prev, id: data.budget.id }))
            toast({ title: "✓ Vårdförbundet-budget sparad!" })
            router.refresh()
        } catch (error) {
            console.error(error)
            toast({
                variant: "destructive",
                title: "Fel vid sparande",
                description: error instanceof Error ? error.message : 'Okänt fel'
            })
        } finally {
            setSaving(false)
        }
    }

    // Save Kommunal budget
    const handleSaveKommunal = async () => {
        setSaving(true)
        try {
            const response = await fetch('/api/salary-review/union-budgets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cycle_id: cycle.id,
                    union_type: 'kommunal',
                    guaranteed_per_employee: komBudget.guaranteed_per_employee,
                    variable_budget: komBudget.variable_budget
                })
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.error)

            setKomBudget(prev => ({ ...prev, id: data.budget.id }))
            toast({ title: "✓ Kommunal-budget sparad!" })
            router.refresh()
        } catch (error) {
            console.error(error)
            toast({
                variant: "destructive",
                title: "Fel vid sparande",
                description: error instanceof Error ? error.message : 'Okänt fel'
            })
        } finally {
            setSaving(false)
        }
    }

    // Save allocations for a union type
    const handleSaveAllocations = async (unionType: 'vardförbundet' | 'kommunal') => {
        const budgetId = unionType === 'vardförbundet' ? vfBudget.id : komBudget.id
        const allocations = unionType === 'vardförbundet' ? vfAllocations : komAllocations

        if (!budgetId) {
            toast({
                variant: "destructive",
                title: "Spara budget först",
                description: "Du måste spara budgetinställningarna innan du kan fördela."
            })
            return
        }

        setSaving(true)
        try {
            const allocArray = Object.entries(allocations)
                .filter(([_, a]) => a.amount && parseFloat(a.amount) > 0)
                .map(([stationId, a]) => ({
                    station_id: stationId,
                    allocated_amount: parseFloat(a.amount),
                    notes: a.notes
                }))

            const response = await fetch('/api/salary-review/station-union-allocations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vo_union_budget_id: budgetId,
                    allocations: allocArray
                })
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.error)

            toast({ title: `✓ Fördelning sparad! (${allocArray.length} stationer)` })
            router.refresh()
        } catch (error) {
            console.error(error)
            toast({
                variant: "destructive",
                title: "Fel vid sparande"
            })
        } finally {
            setSaving(false)
        }
    }

    // Calculate totals
    const vfTotalAllocated = Object.values(vfAllocations).reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0)
    const komTotalAllocated = Object.values(komAllocations).reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0)

    if (loading) {
        return <div className="container mx-auto py-8">Laddar budgetar...</div>
    }

    return (
        <div className="container mx-auto py-8 max-w-5xl">
            <Link href="/salary-review">
                <Button variant="ghost" className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tillbaka till översikt
                </Button>
            </Link>

            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Budgethantering per Avtalsområde</h1>
                <p className="text-muted-foreground">
                    {vo.name} - Löneöversyn {cycle.year}
                </p>
            </div>

            <Tabs defaultValue="vardförbundet" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="vardförbundet" className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Vårdförbundet (SSK/VUB)
                    </TabsTrigger>
                    <TabsTrigger value="kommunal" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Kommunal (AMB)
                    </TabsTrigger>
                </TabsList>

                {/* VÅRDFÖRBUNDET TAB */}
                <TabsContent value="vardförbundet" className="space-y-6">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Vårdförbundet:</strong> Totalbudget fördelas poängbaserat + extra summa per Särskilt yrkesskicklig.
                        </AlertDescription>
                    </Alert>

                    <Card>
                        <CardHeader>
                            <CardTitle>Budgetinställningar - Vårdförbundet</CardTitle>
                            <CardDescription>SSK och VUB-anställda</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <Label htmlFor="vf-total">Total Budget (kr)</Label>
                                    <Input
                                        id="vf-total"
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={vfBudget.total_budget || ''}
                                        onChange={(e) => setVfBudget(prev => ({
                                            ...prev,
                                            total_budget: parseFloat(e.target.value) || undefined
                                        }))}
                                        placeholder="t.ex. 500000"
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Fördelas poängbaserat mellan medarbetare
                                    </p>
                                </div>
                                <div>
                                    <Label htmlFor="vf-skilled" className="flex items-center gap-2">
                                        <Award className="h-4 w-4" />
                                        Extra per Särskilt yrkesskicklig (kr/mån)
                                    </Label>
                                    <Input
                                        id="vf-skilled"
                                        type="number"
                                        min="0"
                                        step="100"
                                        value={vfBudget.extra_skilled_amount || ''}
                                        onChange={(e) => setVfBudget(prev => ({
                                            ...prev,
                                            extra_skilled_amount: parseFloat(e.target.value) || undefined
                                        }))}
                                        placeholder="t.ex. 1000"
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Fast belopp per person som bedömts Särskilt yrkesskicklig
                                    </p>
                                </div>
                            </div>
                            <LoadingButton onClick={handleSaveVardförbundet} isLoading={saving}>
                                <Save className="mr-2 h-4 w-4" />
                                Spara Budgetinställningar
                            </LoadingButton>
                        </CardContent>
                    </Card>

                    {/* VF Allocations */}
                    {vfBudget.id && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    Fördela till stationer
                                </CardTitle>
                                <CardDescription>
                                    Total: {vfBudget.total_budget?.toLocaleString('sv-SE')} kr |
                                    Fördelat: {vfTotalAllocated.toLocaleString('sv-SE')} kr |
                                    Kvar: {((vfBudget.total_budget || 0) - vfTotalAllocated).toLocaleString('sv-SE')} kr
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {stations.map((station) => (
                                    <div key={station.id} className="border rounded-lg p-4">
                                        <h4 className="font-medium mb-2">{station.name}</h4>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <Label>Budget (kr)</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={vfAllocations[station.id]?.amount || ''}
                                                    onChange={(e) => setVfAllocations(prev => ({
                                                        ...prev,
                                                        [station.id]: { ...prev[station.id], amount: e.target.value }
                                                    }))}
                                                />
                                            </div>
                                            <div>
                                                <Label>Anteckningar</Label>
                                                <Textarea
                                                    value={vfAllocations[station.id]?.notes || ''}
                                                    onChange={(e) => setVfAllocations(prev => ({
                                                        ...prev,
                                                        [station.id]: { ...prev[station.id], notes: e.target.value }
                                                    }))}
                                                    rows={1}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <LoadingButton
                                    onClick={() => handleSaveAllocations('vardförbundet')}
                                    isLoading={saving}
                                    className="w-full"
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    Spara Fördelning
                                </LoadingButton>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* KOMMUNAL TAB */}
                <TabsContent value="kommunal" className="space-y-6">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Kommunal:</strong> Garanterad ökning per anställd + rörlig del som fördelas poängbaserat.
                        </AlertDescription>
                    </Alert>

                    <Card>
                        <CardHeader>
                            <CardTitle>Budgetinställningar - Kommunal</CardTitle>
                            <CardDescription>AMB-anställda</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <Label htmlFor="kom-guaranteed">Garanterad ökning per anställd (kr/mån)</Label>
                                    <Input
                                        id="kom-guaranteed"
                                        type="number"
                                        min="0"
                                        step="100"
                                        value={komBudget.guaranteed_per_employee || ''}
                                        onChange={(e) => setKomBudget(prev => ({
                                            ...prev,
                                            guaranteed_per_employee: parseFloat(e.target.value) || undefined
                                        }))}
                                        placeholder="t.ex. 600"
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Alla AMB-anställda får minst detta belopp
                                    </p>
                                </div>
                                <div>
                                    <Label htmlFor="kom-variable">Rörlig budget för poängfördelning (kr)</Label>
                                    <Input
                                        id="kom-variable"
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={komBudget.variable_budget || ''}
                                        onChange={(e) => setKomBudget(prev => ({
                                            ...prev,
                                            variable_budget: parseFloat(e.target.value) || undefined
                                        }))}
                                        placeholder="t.ex. 100000"
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Fördelas poängbaserat mellan medarbetare
                                    </p>
                                </div>
                            </div>
                            <LoadingButton onClick={handleSaveKommunal} isLoading={saving}>
                                <Save className="mr-2 h-4 w-4" />
                                Spara Budgetinställningar
                            </LoadingButton>
                        </CardContent>
                    </Card>

                    {/* Kommunal Allocations */}
                    {komBudget.id && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    Fördela rörlig del till stationer
                                </CardTitle>
                                <CardDescription>
                                    Rörlig budget: {komBudget.variable_budget?.toLocaleString('sv-SE')} kr |
                                    Fördelat: {komTotalAllocated.toLocaleString('sv-SE')} kr |
                                    Kvar: {((komBudget.variable_budget || 0) - komTotalAllocated).toLocaleString('sv-SE')} kr
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {stations.map((station) => (
                                    <div key={station.id} className="border rounded-lg p-4">
                                        <h4 className="font-medium mb-2">{station.name}</h4>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <Label>Rörlig budget (kr)</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={komAllocations[station.id]?.amount || ''}
                                                    onChange={(e) => setKomAllocations(prev => ({
                                                        ...prev,
                                                        [station.id]: { ...prev[station.id], amount: e.target.value }
                                                    }))}
                                                />
                                            </div>
                                            <div>
                                                <Label>Anteckningar</Label>
                                                <Textarea
                                                    value={komAllocations[station.id]?.notes || ''}
                                                    onChange={(e) => setKomAllocations(prev => ({
                                                        ...prev,
                                                        [station.id]: { ...prev[station.id], notes: e.target.value }
                                                    }))}
                                                    rows={1}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <LoadingButton
                                    onClick={() => handleSaveAllocations('kommunal')}
                                    isLoading={saving}
                                    className="w-full"
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    Spara Fördelning
                                </LoadingButton>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
