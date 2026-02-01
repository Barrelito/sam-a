'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Users, DollarSign } from 'lucide-react'

interface OutlierEmployee {
    id: string
    name: string
    salary: number
    diff_percentage: number
    deviation_type: 'low' | 'high'
}

interface GroupCardProps {
    category: string
    experienceLevel: string
    stats: {
        median: number
        avg: number
        count: number
        min: number
        max: number
        range: string
    }
    deviations: OutlierEmployee[]
}

export function SalaryGroupCard({ category, experienceLevel, stats, deviations }: GroupCardProps) {
    const lowDeviations = deviations.filter(d => d.deviation_type === 'low')
    const highDeviations = deviations.filter(d => d.deviation_type === 'high')
    const hasDeviations = deviations.length > 0

    return (
        <Card className={`transition-all ${hasDeviations ? 'border-l-4 border-l-amber-500' : ''}`}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-lg">{category}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            {experienceLevel} års erfarenhet
                        </p>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                        <Users className="h-3 w-3 mr-1" />
                        {stats.count}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Statistics Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <DollarSign className="h-3 w-3" />
                            Medianlön
                        </div>
                        <div className="text-lg font-bold">
                            {stats.median.toLocaleString('sv-SE')} kr
                        </div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">
                            Genomsnitt
                        </div>
                        <div className="text-lg font-bold">
                            {stats.avg.toLocaleString('sv-SE')} kr
                        </div>
                    </div>
                    <div className="col-span-2 bg-muted/50 p-3 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">
                            Lönespann
                        </div>
                        <div className="text-sm font-semibold">
                            {stats.min.toLocaleString('sv-SE')} - {stats.max.toLocaleString('sv-SE')} kr
                        </div>
                        <div className="w-full h-2 bg-gradient-to-r from-blue-200 via-green-200 to-blue-200 rounded-full mt-2" />
                    </div>
                </div>

                {/* Deviations */}
                {hasDeviations && (
                    <div className="space-y-2 pt-2 border-t">
                        <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-500">
                            ⚠️ Avvikelser (±10%)
                        </h4>
                        <div className="space-y-1.5">
                            {lowDeviations.map((dev) => (
                                <div
                                    key={dev.id}
                                    className="flex items-center justify-between p-2 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
                                >
                                    <div className="flex items-center gap-2">
                                        <TrendingDown className="h-4 w-4 text-red-600" />
                                        <span className="text-sm font-medium">{dev.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-red-700 dark:text-red-400">
                                            {dev.diff_percentage}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {dev.salary.toLocaleString('sv-SE')} kr
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {highDeviations.map((dev) => (
                                <div
                                    key={dev.id}
                                    className="flex items-center justify-between p-2 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900"
                                >
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-orange-600" />
                                        <span className="text-sm font-medium">{dev.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-orange-700 dark:text-orange-400">
                                            +{dev.diff_percentage}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {dev.salary.toLocaleString('sv-SE')} kr
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!hasDeviations && (
                    <div className="text-center py-2 text-sm text-green-600 dark:text-green-400">
                        ✓ Ingen signifikant avvikelse
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
