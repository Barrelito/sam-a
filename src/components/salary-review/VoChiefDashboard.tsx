'use client'

// VO Chief Dashboard - Översikt över budget och progress

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, Users, CheckCircle2, Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface VoChiefDashboardProps {
    vo: any
    cycle: any
    userName: string
}

export default function VoChiefDashboard({ vo, cycle, userName }: VoChiefDashboardProps) {
    const [loading, setLoading] = useState(true)
    const [budgetData, setBudgetData] = useState<any>(null)
    const [progressData, setProgressData] = useState<any>(null)

    useEffect(() => {
        async function loadData() {
            try {
                // Load budget
                const budgetRes = await fetch(`/api/salary-review/vo-budgets?cycle_id=${cycle.id}`)
                const budget = await budgetRes.json()
                setBudgetData(budget)

                // Load progress
                const progressRes = await fetch(`/api/salary-review/vo-progress?cycle_id=${cycle.id}`)
                const progress = await progressRes.json()
                setProgressData(progress)
            } catch (error) {
                console.error('Error loading data:', error)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [cycle.id])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    const totalBudget = budgetData?.budget?.total_budget || 0
    const allocatedBudget = budgetData?.allocated_budget || 0
    const remainingBudget = budgetData?.remaining_budget || 0
    const hasBudget = budgetData?.budget !== null

    const totalEmployees = progressData?.total_employees || 0
    const assessedEmployees = progressData?.employees_assessed || 0
    const completedEmployees = progressData?.employees_completed || 0
    const progressPercent = totalEmployees > 0 ? Math.round((completedEmployees / totalEmployees) * 100) : 0

    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Löneöversyn - VO-chef</h1>
                <p className="text-muted-foreground">
                    Välkommen {userName}! Hantera budget och följ förloppet för {vo.name}.
                </p>
            </div>

            {/* Active Cycle */}
            {cycle && (
                <Card className="mb-6 border-primary">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Aktiv Löneöversynscykel
                        </CardTitle>
                        <CardDescription>
                            År {cycle.year} - Status: {cycle.status}
                        </CardDescription>
                    </CardHeader>
                    {cycle.description && (
                        <CardContent>
                            <p className="text-sm">{cycle.description}</p>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Budget Overview */}
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Budgetöversikt
                            </CardTitle>
                            <CardDescription>
                                {hasBudget ? 'Din budget och fördelning' : 'Ingen budget satt ännu'}
                            </CardDescription>
                        </div>
                        <Link href="/salary-review/vo-budget">
                            <Button>
                                {hasBudget ? 'Hantera Budget' : 'Sätt Budget'}
                            </Button>
                        </Link>
                    </div>
                </CardHeader>
                {hasBudget && (
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Budget</p>
                                <p className="text-2xl font-bold">{parseFloat(totalBudget).toLocaleString('sv-SE')} kr</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Fördelat</p>
                                <p className="text-2xl font-bold text-blue-600">{parseFloat(allocatedBudget).toLocaleString('sv-SE')} kr</p>
                                <p className="text-xs text-muted-foreground">
                                    {totalBudget > 0 ? Math.round((allocatedBudget / totalBudget) * 100) : 0}% av budget
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Återstår</p>
                                <p className={`text-2xl font-bold ${remainingBudget < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {parseFloat(remainingBudget).toLocaleString('sv-SE')} kr
                                </p>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Progress Overview */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Förloppsöversikt
                    </CardTitle>
                    <CardDescription>
                        Status för löneöversyn i ditt VO
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <p className="text-sm text-muted-foreground">Totalt Medarbetare</p>
                            <p className="text-2xl font-bold">{totalEmployees}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Bedömda</p>
                            <p className="text-2xl font-bold text-blue-600">{assessedEmployees}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Slutförda</p>
                            <p className="text-2xl font-bold text-green-600">{completedEmployees}</p>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Totalt förlopp</span>
                            <span className="text-sm text-muted-foreground">{progressPercent}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                    </div>
                </CardContent>
            </Card>

            {/* Station Progress */}
            {progressData?.stations && progressData.stations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Stationer
                        </CardTitle>
                        <CardDescription>
                            Förlopp per station i ditt VO
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {progressData.stations.map((station: any) => {
                                const stationProgress = station.employee_count > 0
                                    ? Math.round((station.completed_count / station.employee_count) * 100)
                                    : 0
                                const allocationData = budgetData?.budget?.allocations?.find((a: any) => a.station_id === station.station_id)

                                return (
                                    <div key={station.station_id} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-medium">{station.station_name}</h3>
                                            {station.completed_count === station.employee_count && station.employee_count > 0 && (
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            )}
                                        </div>

                                        <div className="grid gap-2 md:grid-cols-4 mb-3 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">Medarbetare</p>
                                                <p className="font-medium">{station.employee_count}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Bedömda</p>
                                                <p className="font-medium">{station.assessed_count}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Slutförda</p>
                                                <p className="font-medium">{station.completed_count}</p>
                                            </div>
                                            {allocationData && (
                                                <div>
                                                    <p className="text-muted-foreground">Budget</p>
                                                    <p className="font-medium">{parseFloat(allocationData.allocated_amount).toLocaleString('sv-SE')} kr</p>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-muted-foreground">Förlopp</span>
                                                <span className="text-xs font-medium">{stationProgress}%</span>
                                            </div>
                                            <Progress value={stationProgress} className="h-1" />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
