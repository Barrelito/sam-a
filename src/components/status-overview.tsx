"use client"

import { RecurringTask } from "@/lib/types"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Clock, Circle } from "lucide-react"

interface StatusOverviewProps {
    tasks: RecurringTask[]
    title?: string
}

export function StatusOverview({ tasks, title = "Tertial Progress" }: StatusOverviewProps) {
    const total = tasks.length
    const done = tasks.filter(t => t.status === 'done').length
    const inProgress = tasks.filter(t => t.status === 'in_progress').length
    const notStarted = tasks.filter(t => t.status === 'not_started').length
    const completionPercentage = total > 0 ? Math.round((done / total) * 100) : 0

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Slutfört</span>
                            <span className="font-medium">{completionPercentage}%</span>
                        </div>
                        <Progress value={done} max={total} />
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-full bg-slate-100">
                                <Circle className="h-4 w-4 text-slate-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{notStarted}</p>
                                <p className="text-xs text-muted-foreground">Ej påbörjad</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-full bg-amber-100">
                                <Clock className="h-4 w-4 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{inProgress}</p>
                                <p className="text-xs text-muted-foreground">Pågående</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-full bg-emerald-100">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{done}</p>
                                <p className="text-xs text-muted-foreground">Klar</p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
