'use client'

import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, TrendingDown, TrendingUp, Users, DollarSign } from 'lucide-react'

interface SummaryDashboardProps {
    totalEmployees: number
    totalDeviations: number
    lowDeviations: number
    highDeviations: number
    groupCount: number
}

export function SalaryAnalysisSummary({
    totalEmployees,
    totalDeviations,
    lowDeviations,
    highDeviations,
    groupCount
}: SummaryDashboardProps) {
    const deviationRate = ((totalDeviations / totalEmployees) * 100).toFixed(1)
    const hasHighDeviations = parseFloat(deviationRate) > 20

    return (
        <div className="space-y-4">
            {/* Alert if high deviation rate */}
            {hasHighDeviations && (
                <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                    <CardContent className="py-4 flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <div className="text-sm">
                            <strong className="text-amber-900 dark:text-amber-200">
                                Hög avvikelseprocent:
                            </strong>{' '}
                            <span className="text-amber-700 dark:text-amber-300">
                                {deviationRate}% av medarbetarna har löneavvikelser över ±10% från sin grupps median.
                            </span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Totalt medarbetare
                                </p>
                                <p className="text-2xl font-bold mt-1">{totalEmployees}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Lönegrupper
                                </p>
                                <p className="text-2xl font-bold mt-1">{groupCount}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Totala avvikelser
                                </p>
                                <p className="text-2xl font-bold mt-1">{totalDeviations}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {deviationRate}% av alla
                                </p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-amber-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    För låg lön
                                </p>
                                <p className="text-2xl font-bold mt-1 text-red-600">
                                    {lowDeviations}
                                </p>
                            </div>
                            <TrendingDown className="h-8 w-8 text-red-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    För hög lön
                                </p>
                                <p className="text-2xl font-bold mt-1 text-orange-600">
                                    {highDeviations}
                                </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
