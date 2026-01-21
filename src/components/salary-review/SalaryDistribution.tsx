'use client'

// Salary Distribution Component
// Smart fördelning per avtalsområde (Vårdförbundet vs Kommunal)

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { LoadingButton } from '@/components/ui/loading-button'
import { Save, RefreshCw, AlertTriangle, CheckCircle2, Award, Briefcase, Users, Info } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'

interface Employee {
    id: string
    name: string
    category: 'VUB' | 'SSK' | 'AMB'
    unionGroup: 'vardforbundet' | 'kommunal'
    current_salary: number
    average_rating: number
    review_id: string | null
    is_particularly_skilled: boolean

    proposed_increase: number
    final_increase: number
    new_salary: number

    // Calculation parts
    points_part?: number
    skilled_part?: number

    guaranteed_part?: number
    variable_part?: number
}

interface DistributionData {
    station_id: string
    cycle_id: string
    budgets: {
        vardforbundet: {
            allocated_amount: number // Variable/Points pot
            extra_skilled_amount: number
            total_proposed: number
        }
        kommunal: {
            allocated_amount: number // Variable pot
            guaranteed_per_employee: number
            total_proposed: number
        }
    }
    employees: Employee[]
}

interface SalaryDistributionProps {
    stationId: string
    stationName: string
    cycleId: string
}

export default function SalaryDistribution({ stationId, stationName, cycleId }: SalaryDistributionProps) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [data, setData] = useState<DistributionData | null>(null)
    const [adjustments, setAdjustments] = useState<Record<string, number>>({})

    // Load distribution data
    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/salary-review/salary-distribution?station_id=${stationId}&cycle_id=${cycleId}`)
            const jsonData = await res.json()

            if (!res.ok) {
                throw new Error(jsonData.error)
            }

            setData(jsonData)

            // Initialize adjustments map
            const adj: Record<string, number> = {}
            jsonData.employees.forEach((emp: Employee) => {
                adj[emp.id] = emp.final_increase
            })
            setAdjustments(adj)
        } catch (error) {
            console.error('Error loading distribution:', error)
            toast({
                variant: "destructive",
                title: "Fel vid laddning",
                description: "Kunde inte ladda lönefördelning"
            })
        } finally {
            setLoading(false)
        }
    }, [stationId, cycleId, toast])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Handle adjustment change
    const handleAdjustmentChange = (empId: string, value: string) => {
        const numValue = parseFloat(value) || 0
        setAdjustments(prev => ({ ...prev, [empId]: numValue }))
    }

    // Reset to proposed
    const resetToProposed = () => {
        if (!data) return
        const adj: Record<string, number> = {}
        data.employees.forEach(emp => {
            adj[emp.id] = emp.proposed_increase
        })
        setAdjustments(adj)
    }

    // Save allocations
    const handleSave = async () => {
        if (!data) return
        setSaving(true)
        try {
            const allocations = data.employees
                .filter(emp => emp.review_id)
                .map(emp => ({
                    review_id: emp.review_id,
                    final_increase: adjustments[emp.id] || 0,
                    proposed_increase: emp.proposed_increase // Save calculated proposed too
                }))

            const res = await fetch('/api/salary-review/salary-distribution', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ allocations })
            })

            if (!res.ok) {
                throw new Error('Failed to save')
            }

            toast({
                title: "✓ Fördelning sparad!",
                description: `${allocations.length} medarbetare uppdaterade`
            })

            await loadData()
        } catch (error) {
            console.error('Error saving:', error)
            toast({
                variant: "destructive",
                title: "Fel vid sparande",
                description: "Kunde inte spara fördelningen"
            })
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8 text-center text-muted-foreground">Laddar lönefördelning...</div>
    if (!data) return <div className="p-8 text-center text-red-500">Kunde inte ladda data.</div>

    // Calculate Totals per Union
    // VF: Allocated is variable pot. Diff = Allocated - (TotalAdjusted - SkilledFixed)
    const vfEmployees = data.employees.filter(e => e.unionGroup === 'vardforbundet')
    const vfAllocated = data.budgets.vardforbundet.allocated_amount
    const vfExtraSkilled = data.budgets.vardforbundet.extra_skilled_amount

    // Total adjusted sum for VF
    const vfTotalAdjusted = vfEmployees.reduce((sum, e) => sum + (adjustments[e.id] || 0), 0)

    // Calculate how much of the adjustment is "fixed" costs (extra skilled)
    const vfFixedCost = vfEmployees.filter(e => e.is_particularly_skilled).length * vfExtraSkilled

    // Remaining variable part used
    const vfVariableUsed = Math.max(0, vfTotalAdjusted - vfFixedCost)
    const vfDiff = vfAllocated - vfVariableUsed

    // Kommunal: Allocated is variable pot. Diff = Allocated - (TotalAdjusted - GuaranteedFixed)
    const komEmployees = data.employees.filter(e => e.unionGroup === 'kommunal')
    const komAllocated = data.budgets.kommunal.allocated_amount
    const komGuaranteed = data.budgets.kommunal.guaranteed_per_employee

    // Total adjusted
    const komTotalAdjusted = komEmployees.reduce((sum, e) => sum + (adjustments[e.id] || 0), 0)

    // Fixed cost
    const komFixedCost = komEmployees.length * komGuaranteed

    // Variable used
    const komVariableUsed = Math.max(0, komTotalAdjusted - komFixedCost)
    const komDiff = komAllocated - komVariableUsed

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">{stationName}</h2>
                    <p className="text-muted-foreground">Lönefördelning per avtalsområde</p>
                </div>
                <Button variant="outline" size="sm" onClick={resetToProposed}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Återställ alla förslag
                </Button>
            </div>

            <Tabs defaultValue="vardforbundet" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="vardforbundet" className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Vårdförbundet (SSK/VUB)
                    </TabsTrigger>
                    <TabsTrigger value="kommunal" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Kommunal (AMB)
                    </TabsTrigger>
                </TabsList>

                {/* --- VÅRDFÖRBUNDET CONTENT --- */}
                <TabsContent value="vardforbundet" className="space-y-6">
                    {/* Budget Summary */}
                    {vfAllocated === 0 ? (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>Ingen poängbudget tilldelad för Vårdförbundet än.</AlertDescription>
                        </Alert>
                    ) : (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="grid gap-4 md:grid-cols-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Poängbudget (Pott)</p>
                                        <p className="text-2xl font-bold">{vfAllocated.toLocaleString('sv-SE')} kr</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Föreslaget Totalt</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {data.budgets.vardforbundet.total_proposed.toLocaleString('sv-SE')} kr
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Din Fördelning</p>
                                        <p className="text-2xl font-bold">{vfTotalAdjusted.toLocaleString('sv-SE')} kr</p>
                                        <p className="text-xs text-muted-foreground">Varav {vfFixedCost.toLocaleString('sv-SE')} kr i fasta tillägg</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Pott kvar att fördela</p>
                                        <p className={`text-2xl font-bold ${vfDiff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {vfDiff.toLocaleString('sv-SE')} kr
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Employee Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Medarbetare (Vårdförbundet)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {vfEmployees.map(emp => {
                                    const val = adjustments[emp.id] || 0
                                    const newSal = emp.current_salary + val

                                    return (
                                        <div key={emp.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center py-3 border-b">
                                            <div className="md:col-span-2">
                                                <div className="font-medium flex items-center gap-2">
                                                    {emp.name}
                                                    {emp.is_particularly_skilled && (
                                                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                                                            <Award className="h-3 w-3 mr-1" />
                                                            Särskilt yrkesskicklig
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                                                    <span>{emp.category}</span>
                                                    <span>•</span>
                                                    <span>Betyg: {emp.average_rating.toFixed(1)}</span>
                                                </div>
                                            </div>

                                            <div className="text-sm text-muted-foreground">
                                                <div className="flex justify-between"><span>Poängdel:</span> <span>{emp.points_part?.toLocaleString()} kr</span></div>
                                                {emp.is_particularly_skilled && (
                                                    <div className="flex justify-between text-yellow-700"><span>Skicklighet:</span> <span>+{emp.skilled_part?.toLocaleString()} kr</span></div>
                                                )}
                                            </div>

                                            <div className="text-right text-muted-foreground">
                                                {emp.current_salary.toLocaleString()} kr
                                            </div>

                                            <div className="text-right">
                                                <Input
                                                    type="number"
                                                    value={val}
                                                    onChange={(e) => handleAdjustmentChange(emp.id, e.target.value)}
                                                    className="w-24 ml-auto text-right"
                                                />
                                            </div>

                                            <div className="text-right font-medium">
                                                {newSal.toLocaleString()} kr
                                            </div>
                                        </div>
                                    )
                                })}
                                {vfEmployees.length === 0 && <p className="text-muted-foreground text-center py-4">Inga medarbetare.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- KOMMUNAL CONTENT --- */}
                <TabsContent value="kommunal" className="space-y-6">
                    {/* Budget Summary */}
                    {komAllocated === 0 ? (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>Ingen rörlig budget tilldelad för Kommunal än.</AlertDescription>
                        </Alert>
                    ) : (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="grid gap-4 md:grid-cols-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Variable Budget (Pott)</p>
                                        <p className="text-2xl font-bold">{komAllocated.toLocaleString('sv-SE')} kr</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Föreslaget Totalt</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {data.budgets.kommunal.total_proposed.toLocaleString('sv-SE')} kr
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Din Fördelning</p>
                                        <p className="text-2xl font-bold">{komTotalAdjusted.toLocaleString('sv-SE')} kr</p>
                                        <p className="text-xs text-muted-foreground">Varav {komFixedCost.toLocaleString('sv-SE')} kr i garantilön</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Pott kvar att fördela</p>
                                        <p className={`text-2xl font-bold ${komDiff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {komDiff.toLocaleString('sv-SE')} kr
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Employee Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Medarbetare (Kommunal)</CardTitle>
                            <CardDescription>Garanterad ökning {komGuaranteed} kr/mån + rörlig del</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {komEmployees.map(emp => {
                                    const val = adjustments[emp.id] || 0
                                    const newSal = emp.current_salary + val

                                    return (
                                        <div key={emp.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center py-3 border-b">
                                            <div className="md:col-span-2">
                                                <div className="font-medium">
                                                    {emp.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                                                    <span>{emp.category}</span>
                                                    <span>•</span>
                                                    <span>Betyg: {emp.average_rating.toFixed(1)}</span>
                                                </div>
                                            </div>

                                            <div className="text-sm text-muted-foreground">
                                                <div className="flex justify-between text-green-700"><span>Garanti:</span> <span>{emp.guaranteed_part?.toLocaleString()} kr</span></div>
                                                <div className="flex justify-between"><span>Poängdel:</span> <span>+{emp.variable_part?.toLocaleString()} kr</span></div>
                                            </div>

                                            <div className="text-right text-muted-foreground">
                                                {emp.current_salary.toLocaleString()} kr
                                            </div>

                                            <div className="text-right">
                                                <Input
                                                    type="number"
                                                    value={val}
                                                    onChange={(e) => handleAdjustmentChange(emp.id, e.target.value)}
                                                    className="w-24 ml-auto text-right"
                                                />
                                            </div>

                                            <div className="text-right font-medium">
                                                {newSal.toLocaleString()} kr
                                            </div>
                                        </div>
                                    )
                                })}
                                {komEmployees.length === 0 && <p className="text-muted-foreground text-center py-4">Inga medarbetare.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-4 border-t">
                {/* Vi tillåter spara även om budget spräckts, men visar varning i UI:t */}
                <LoadingButton
                    size="lg"
                    onClick={handleSave}
                    isLoading={saving}
                    loadingText="Sparar..."
                >
                    <Save className="mr-2 h-4 w-4" />
                    Spara Alla Ändringar
                </LoadingButton>
            </div>
        </div>
    )
}
