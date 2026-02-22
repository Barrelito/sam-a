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
    skilled_amount?: number

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
    stationId?: string
    stationName?: string
    stationGroupId?: string
    stationGroupName?: string
    cycleId: string
}

export default function SalaryDistribution({
    stationId,
    stationName,
    stationGroupId,
    stationGroupName,
    cycleId
}: SalaryDistributionProps) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [data, setData] = useState<DistributionData | null>(null)
    const [adjustments, setAdjustments] = useState<Record<string, string | number>>({})
    const [skilledAdjustments, setSkilledAdjustments] = useState<Record<string, string | number>>({})
    const [sortBy, setSortBy] = useState<'rating-asc' | 'rating-desc' | null>(null)

    // Load distribution data
    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            // Build query params based on whether we have station or station group
            const params = new URLSearchParams()
            if (stationGroupId) {
                params.append('station_group_id', stationGroupId)
            } else if (stationId) {
                params.append('station_id', stationId)
            }
            params.append('cycle_id', cycleId)

            const res = await fetch(`/api/salary-review/salary-distribution?${params.toString()}`)
            const jsonData = await res.json()

            if (!res.ok) {
                throw new Error(jsonData.error)
            }

            setData(jsonData)

            // Initialize adjustments map
            const adj: Record<string, string | number> = {}
            const skilledAdj: Record<string, string | number> = {}
            jsonData.employees.forEach((emp: Employee) => {
                adj[emp.id] = emp.final_increase
                if (emp.is_particularly_skilled) {
                    skilledAdj[emp.id] = emp.skilled_amount || 0
                }
            })
            setAdjustments(adj)
            setSkilledAdjustments(skilledAdj)
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
    }, [stationId, stationGroupId, cycleId, toast])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Handle adjustment change
    const handleAdjustmentChange = (empId: string, value: string) => {
        if (value === '') {
            setAdjustments(prev => ({ ...prev, [empId]: '' }))
            return
        }
        const numValue = parseFloat(value)
        setAdjustments(prev => ({ ...prev, [empId]: isNaN(numValue) ? '' : numValue }))
    }

    const handleSkilledAdjustmentChange = (empId: string, value: string) => {
        if (value === '') {
            setSkilledAdjustments(prev => ({ ...prev, [empId]: '' }))
            return
        }
        const numValue = parseFloat(value)
        setSkilledAdjustments(prev => ({ ...prev, [empId]: isNaN(numValue) ? '' : numValue }))
    }

    // Reset to proposed
    const resetToProposed = () => {
        if (!data) return
        const adj: Record<string, string | number> = {}
        const skilledAdj: Record<string, string | number> = {}
        data.employees.forEach(emp => {
            adj[emp.id] = emp.proposed_increase
            if (emp.is_particularly_skilled) {
                skilledAdj[emp.id] = emp.skilled_amount || 0
            }
        })
        setAdjustments(adj)
        setSkilledAdjustments(skilledAdj)
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
                    final_increase: typeof adjustments[emp.id] === 'number' && !isNaN(adjustments[emp.id] as number) ? adjustments[emp.id] : 0,
                    proposed_increase: emp.proposed_increase, // Save calculated proposed too
                    skilled_amount: emp.is_particularly_skilled ? (typeof skilledAdjustments[emp.id] === 'number' && !isNaN(skilledAdjustments[emp.id] as number) ? skilledAdjustments[emp.id] : 0) : 0
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

    // Total adjusted sum for VF (Only variables)
    const vfTotalAdjusted = vfEmployees.reduce((sum, e) => sum + (typeof adjustments[e.id] === 'number' && !isNaN(adjustments[e.id] as number) ? adjustments[e.id] as number : 0), 0)

    // Total adjusted skilled amount for VF
    const vfTotalSkilled = vfEmployees.reduce((sum, e) => sum + (e.is_particularly_skilled && typeof skilledAdjustments[e.id] === 'number' && !isNaN(skilledAdjustments[e.id] as number) ? skilledAdjustments[e.id] as number : 0), 0)

    // Remaining variable part used
    const vfVariableUsed = vfTotalAdjusted
    const vfDiff = vfAllocated - vfVariableUsed

    // Kommunal: Allocated is variable pot. Diff = Allocated - (TotalAdjusted - GuaranteedFixed)
    const komEmployees = data.employees.filter(e => e.unionGroup === 'kommunal')
    const komAllocated = data.budgets.kommunal.allocated_amount
    const komGuaranteed = data.budgets.kommunal.guaranteed_per_employee

    // Total adjusted
    const komTotalAdjusted = komEmployees.reduce((sum, e) => sum + (typeof adjustments[e.id] === 'number' && !isNaN(adjustments[e.id] as number) ? adjustments[e.id] as number : 0), 0)

    // Total skilled for Kommunal
    const komTotalSkilled = komEmployees.reduce((sum, e) => sum + (e.is_particularly_skilled && typeof skilledAdjustments[e.id] === 'number' && !isNaN(skilledAdjustments[e.id] as number) ? skilledAdjustments[e.id] as number : 0), 0)

    // Fixed cost
    const komFixedCost = komEmployees.length * komGuaranteed

    // Variable used
    const komVariableUsed = Math.max(0, komTotalAdjusted - komFixedCost)
    const komDiff = komAllocated - komVariableUsed

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">
                        {stationGroupName || stationName}
                    </h2>
                    <p className="text-muted-foreground">
                        Lönefördelning per avtalsområde
                        {stationGroupName && <span className="ml-1 text-xs">(Stationsområde)</span>}
                    </p>
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
                                <div className="grid gap-4 md:grid-cols-5">
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
                                        {vfTotalSkilled > 0 && <p className="text-xs text-muted-foreground">Exkl. {vfTotalSkilled.toLocaleString('sv-SE')} kr för yrkesskicklighet</p>}
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Pott kvar att fördela</p>
                                        <p className={`text-2xl font-bold ${vfDiff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {vfDiff.toLocaleString('sv-SE')} kr
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                        <p className="text-sm text-blue-700 font-medium">Riktlinje 3%</p>
                                        <p className="text-2xl font-bold text-blue-900">
                                            {Math.round(vfEmployees.reduce((sum, e) => sum + e.current_salary, 0) * 0.03).toLocaleString('sv-SE')} kr
                                        </p>
                                        <p className="text-xs text-blue-600 mt-1">
                                            baserat på total nuvarande lön
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Employee Table */}
                    <Card>
                        <CardHeader>
                            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 font-semibold text-sm text-muted-foreground border-b pb-2 mb-2">
                                <div className="md:col-span-2">Medarbetare</div>
                                <div className="text-center cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => {
                                    if (sortBy === 'rating-desc') setSortBy('rating-asc')
                                    else if (sortBy === 'rating-asc') setSortBy(null)
                                    else setSortBy('rating-desc')
                                }}>
                                    Betyg {sortBy === 'rating-desc' ? '↓' : sortBy === 'rating-asc' ? '↑' : ''}
                                </div>
                                <div>Lönedelar</div>
                                <div className="text-right">Nuvarande</div>
                                <div className="text-right">Ökning</div>
                                <div className="text-right">Ny lön</div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[...vfEmployees]
                                    .sort((a, b) => {
                                        if (!sortBy) return 0
                                        if (sortBy === 'rating-desc') return b.average_rating - a.average_rating
                                        return a.average_rating - b.average_rating
                                    })
                                    .map(emp => {
                                        const val1 = adjustments[emp.id]
                                        const val = typeof val1 === 'number' && !isNaN(val1) ? val1 : 0
                                        const skilled1 = skilledAdjustments[emp.id]
                                        const skilledVal = emp.is_particularly_skilled ? (typeof skilled1 === 'number' && !isNaN(skilled1) ? skilled1 : 0) : 0
                                        const newSal = emp.current_salary + val + skilledVal

                                        return (
                                            <div key={emp.id} className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center py-3 border-b">
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
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        <span>{emp.category}</span>
                                                    </div>
                                                </div>

                                                <div className="text-center">
                                                    {emp.average_rating > 0 ? (
                                                        <Badge variant={emp.average_rating >= 4 ? "default" : emp.average_rating >= 3 ? "secondary" : "outline"}>
                                                            {emp.average_rating.toFixed(1)}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Ej bedömd</span>
                                                    )}
                                                </div>

                                                <div className="text-sm text-muted-foreground">
                                                    <div className="flex justify-between"><span>Poängdel:</span> <span>{emp.points_part?.toLocaleString()} kr</span></div>
                                                    {emp.is_particularly_skilled && (
                                                        <div className="flex justify-between text-yellow-700 items-center mt-1">
                                                            <span>Skicklighet:</span>
                                                            <Input
                                                                type="text"
                                                                value={skilledAdjustments[emp.id] === undefined ? '' : skilledAdjustments[emp.id]}
                                                                onChange={(e) => handleSkilledAdjustmentChange(emp.id, e.target.value)}
                                                                className="w-16 ml-2 text-right h-7 text-xs border-yellow-300 focus-visible:ring-yellow-500"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="text-right text-muted-foreground">
                                                    {emp.current_salary.toLocaleString()} kr
                                                </div>

                                                <div className="text-right">
                                                    <Input
                                                        type="text"
                                                        value={adjustments[emp.id] === undefined ? '' : adjustments[emp.id]}
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

                                {/* Total Points Footer */}
                                {vfEmployees.length > 0 && (
                                    <div className="border-t-2 border-gray-300 pt-4 mt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                                            <div className="md:col-span-2 font-bold text-lg">
                                                Totalt
                                            </div>
                                            <div className="text-center font-bold text-lg">
                                                {vfEmployees.reduce((sum, e) => sum + e.average_rating, 0)} poäng
                                            </div>
                                            <div className="md:col-span-4"></div>
                                        </div>
                                    </div>
                                )}
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
                                <div className="grid gap-4 md:grid-cols-5">
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
                                        {komTotalSkilled > 0 && <p className="text-xs text-muted-foreground">Exkl. {komTotalSkilled.toLocaleString('sv-SE')} kr för yrkesskicklighet</p>}
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Pott kvar att fördela</p>
                                        <p className={`text-2xl font-bold ${komDiff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {komDiff.toLocaleString('sv-SE')} kr
                                        </p>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                        <p className="text-sm text-green-700 font-medium">Riktlinje 315 kr/person</p>
                                        <p className="text-2xl font-bold text-green-900">
                                            {(komEmployees.length * 315).toLocaleString('sv-SE')} kr
                                        </p>
                                        <p className="text-xs text-green-600 mt-1">
                                            {komEmployees.length} pers. × 315 kr (rörlig pott)
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Employee Table */}
                    <Card>
                        <CardHeader>
                            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 font-semibold text-sm text-muted-foreground border-b pb-2 mb-2">
                                <div className="md:col-span-2">Medarbetare</div>
                                <div className="text-center cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => {
                                    if (sortBy === 'rating-desc') setSortBy('rating-asc')
                                    else if (sortBy === 'rating-asc') setSortBy(null)
                                    else setSortBy('rating-desc')
                                }}>
                                    Betyg {sortBy === 'rating-desc' ? '↓' : sortBy === 'rating-asc' ? '↑' : ''}
                                </div>
                                <div>Lönedelar</div>
                                <div className="text-right">Nuvarande</div>
                                <div className="text-right">Ökning</div>
                                <div className="text-right">Ny lön</div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[...komEmployees]
                                    .sort((a, b) => {
                                        if (!sortBy) return 0
                                        if (sortBy === 'rating-desc') return b.average_rating - a.average_rating
                                        return a.average_rating - b.average_rating
                                    })
                                    .map(emp => {
                                        const val1 = adjustments[emp.id]
                                        const val = typeof val1 === 'number' && !isNaN(val1) ? val1 : 0
                                        const skilled1 = skilledAdjustments[emp.id]
                                        const skilledVal = emp.is_particularly_skilled ? (typeof skilled1 === 'number' && !isNaN(skilled1) ? skilled1 : 0) : 0
                                        const newSal = emp.current_salary + val + skilledVal

                                        return (
                                            <div key={emp.id} className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center py-3 border-b">
                                                <div className="md:col-span-2">
                                                    <div className="font-medium">
                                                        {emp.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        <span>{emp.category}</span>
                                                    </div>
                                                </div>

                                                <div className="text-center">
                                                    {emp.average_rating > 0 ? (
                                                        <Badge variant={emp.average_rating >= 4 ? "default" : emp.average_rating >= 3 ? "secondary" : "outline"}>
                                                            {emp.average_rating.toFixed(1)}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Ej bedömd</span>
                                                    )}
                                                </div>

                                                <div className="text-sm text-muted-foreground space-y-1">
                                                    <div className="flex justify-between text-green-700"><span>Garanti:</span> <span>{emp.guaranteed_part?.toLocaleString()} kr</span></div>
                                                    <div className="flex justify-between"><span>Poängdel:</span> <span>+{emp.variable_part?.toLocaleString()} kr</span></div>
                                                    {emp.is_particularly_skilled && (
                                                        <div className="flex justify-between text-yellow-700 items-center mt-1 pt-1 border-t">
                                                            <span>Skicklighet:</span>
                                                            <Input
                                                                type="text"
                                                                value={skilledAdjustments[emp.id] === undefined ? '' : skilledAdjustments[emp.id]}
                                                                onChange={(e) => handleSkilledAdjustmentChange(emp.id, e.target.value)}
                                                                className="w-16 ml-2 text-right h-7 text-xs border-yellow-300 focus-visible:ring-yellow-500"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="text-right text-muted-foreground">
                                                    {emp.current_salary.toLocaleString()} kr
                                                </div>

                                                <div className="text-right">
                                                    <Input
                                                        type="text"
                                                        value={adjustments[emp.id] === undefined ? '' : adjustments[emp.id]}
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

                                {/* Total Points Footer */}
                                {komEmployees.length > 0 && (
                                    <div className="border-t-2 border-gray-300 pt-4 mt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                                            <div className="md:col-span-2 font-bold text-lg">
                                                Totalt
                                            </div>
                                            <div className="text-center font-bold text-lg">
                                                {komEmployees.reduce((sum, e) => sum + e.average_rating, 0)} poäng
                                            </div>
                                            <div className="md:col-span-3"></div>
                                        </div>
                                    </div>
                                )}
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
