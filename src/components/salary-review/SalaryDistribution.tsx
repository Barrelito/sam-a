'use client'

// Salary Distribution Component
// Smart fördelning av löneökningar baserat på betyg och budget

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { LoadingButton } from '@/components/ui/loading-button'
import { Save, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface Employee {
    id: string
    name: string
    current_salary: number
    average_rating: number
    review_id: string | null
    proposed_increase: number
    final_increase: number
    new_salary: number
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
    const [stationBudget, setStationBudget] = useState(0)
    const [employees, setEmployees] = useState<Employee[]>([])
    const [adjustments, setAdjustments] = useState<Record<string, number>>({})

    // Load distribution data
    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/salary-review/salary-distribution?station_id=${stationId}&cycle_id=${cycleId}`)
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error)
            }

            setStationBudget(data.station_budget)
            setEmployees(data.employees)

            // Initialize adjustments with current final values
            const adj: Record<string, number> = {}
            data.employees.forEach((emp: Employee) => {
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

    // Calculate totals
    const totalProposed = employees.reduce((sum, emp) => sum + emp.proposed_increase, 0)
    const totalAdjusted = Object.values(adjustments).reduce((sum, val) => sum + val, 0)
    const difference = stationBudget - totalAdjusted

    // Reset to proposed
    const resetToProposed = () => {
        const adj: Record<string, number> = {}
        employees.forEach(emp => {
            adj[emp.id] = emp.proposed_increase
        })
        setAdjustments(adj)
    }

    // Save allocations
    const handleSave = async () => {
        setSaving(true)
        try {
            const allocations = employees
                .filter(emp => emp.review_id)
                .map(emp => ({
                    review_id: emp.review_id,
                    final_increase: adjustments[emp.id] || 0,
                    proposed_increase: emp.proposed_increase
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

    if (loading) {
        return <div className="p-8 text-center">Laddar lönefördelning...</div>
    }

    if (stationBudget === 0) {
        return (
            <Card className="border-yellow-300 bg-yellow-50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-800">
                        <AlertTriangle className="h-5 w-5" />
                        Ingen budget tilldelad
                    </CardTitle>
                    <CardDescription className="text-yellow-700">
                        VO-chefen har inte tilldelat någon budget till denna station ännu.
                        Du kan fortsätta göra bedömningar - när budgeten tilldelas kommer fördelningen att beräknas automatiskt.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Budget Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Lönefördelning - {stationName}</CardTitle>
                    <CardDescription>
                        Fördela stationens budget baserat på medarbetarnas betyg
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-4 mb-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Tilldelad Budget</p>
                            <p className="text-2xl font-bold">{stationBudget.toLocaleString('sv-SE')} kr</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Föreslaget (auto)</p>
                            <p className="text-2xl font-bold text-blue-600">{totalProposed.toLocaleString('sv-SE')} kr</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Din fördelning</p>
                            <p className={`text-2xl font-bold ${difference === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                {totalAdjusted.toLocaleString('sv-SE')} kr
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Kvar att fördela</p>
                            <p className={`text-2xl font-bold ${difference === 0 ? 'text-green-600' : difference > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                                {difference.toLocaleString('sv-SE')} kr
                            </p>
                        </div>
                    </div>

                    {difference !== 0 && (
                        <div className={`p-3 rounded-lg ${difference > 0 ? 'bg-orange-50 text-orange-800' : 'bg-red-50 text-red-800'}`}>
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                {difference > 0 ? (
                                    <span>Du har {difference.toLocaleString('sv-SE')} kr kvar att fördela</span>
                                ) : (
                                    <span>Du har överfördelat med {Math.abs(difference).toLocaleString('sv-SE')} kr</span>
                                )}
                            </div>
                        </div>
                    )}

                    {difference === 0 && (
                        <div className="p-3 rounded-lg bg-green-50 text-green-800 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Perfekt! Din fördelning matchar budgeten exakt.</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Employee Distribution Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Medarbetare</CardTitle>
                        <CardDescription>{employees.length} medarbetare</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={resetToProposed}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Återställ förslag
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {/* Header */}
                        <div className="grid grid-cols-6 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                            <div className="col-span-2">Medarbetare</div>
                            <div className="text-center">Betyg</div>
                            <div className="text-right">Nuv. lön</div>
                            <div className="text-right">Ökning</div>
                            <div className="text-right">Ny lön</div>
                        </div>

                        {/* Rows */}
                        {employees.map(emp => {
                            const currentAdjustment = adjustments[emp.id] || 0
                            const newSalary = emp.current_salary + currentAdjustment

                            return (
                                <div key={emp.id} className="grid grid-cols-6 gap-4 items-center py-2 border-b border-gray-100">
                                    <div className="col-span-2">
                                        <p className="font-medium">{emp.name}</p>
                                        {!emp.review_id && (
                                            <Badge variant="outline" className="text-xs mt-1">Ej bedömd</Badge>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <Badge variant={emp.average_rating >= 4 ? "default" : emp.average_rating >= 3 ? "secondary" : "outline"}>
                                            {emp.average_rating.toFixed(1)}
                                        </Badge>
                                    </div>
                                    <div className="text-right text-muted-foreground">
                                        {emp.current_salary.toLocaleString('sv-SE')} kr
                                    </div>
                                    <div className="text-right">
                                        <Input
                                            type="number"
                                            value={currentAdjustment}
                                            onChange={(e) => handleAdjustmentChange(emp.id, e.target.value)}
                                            className="w-28 text-right ml-auto"
                                            min="0"
                                        />
                                    </div>
                                    <div className="text-right font-medium">
                                        {newSalary.toLocaleString('sv-SE')} kr
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <LoadingButton
                    size="lg"
                    onClick={handleSave}
                    isLoading={saving}
                    loadingText="Sparar..."
                    disabled={difference !== 0}
                >
                    <Save className="mr-2 h-4 w-4" />
                    Spara fördelning
                </LoadingButton>
            </div>
        </div>
    )
}
