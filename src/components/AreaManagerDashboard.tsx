"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Task, getDaysUntilDeadline } from "@/lib/types"
import { getCurrentMonth, getMonthName, getTertial } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TaskCard } from "@/components/task-card"
import { Button } from "@/components/ui/button"
import {
    Loader2, CheckCircle, AlertCircle, UserX, TrendingUp,
    CalendarDays, MapPin, FolderOpen, ChevronRight, AlertTriangle
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface StationSummary {
    id: string
    name: string
    tasks: Task[]
}

interface AreaManagerDashboardProps {
    onStatusChange: (taskId: string, newStatus: any) => void
    onPriorityChange: (taskId: string, newPriority: any) => void
}

export function AreaManagerDashboard({ onStatusChange, onPriorityChange }: AreaManagerDashboardProps) {
    const router = useRouter()
    const { profile } = useAuth()
    const [tasks, setTasks] = useState<Task[]>([])
    const [stationSummaries, setStationSummaries] = useState<StationSummary[]>([])
    const [selectedStationId, setSelectedStationId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const currentMonth = getCurrentMonth()
    const monthName = getMonthName(currentMonth)
    const currentTertial = getTertial(currentMonth)

    useEffect(() => {
        async function load() {
            if (!profile) return
            setLoading(true)

            try {
                const supabase = createClient()

                // Hämta stationer i stationsgruppen
                const { data: groupData } = await supabase
                    .from('user_station_groups')
                    .select(`
                        station_group:station_group_id (
                            id, name,
                            station_group_members (
                                station:station_id (id, name)
                            )
                        )
                    `)
                    .eq('user_id', profile.id)

                const myStations: { id: string; name: string }[] = groupData?.flatMap((usg: any) =>
                    usg.station_group?.station_group_members?.map((m: any) => m.station).filter(Boolean) || []
                ) || []

                // Hämta alla uppgifter
                const res = await fetch('/api/tasks')
                const data = await res.json()
                const allTasks: Task[] = data.tasks || []

                // Filtrera: visa stationsuppgifter för mina stationer + egna uppgifter
                const myStationIds = new Set(myStations.map(s => s.id))
                const relevantTasks = allTasks.filter(t => {
                    if (t.is_recurring_master) return false
                    if (t.station_id && myStationIds.has(t.station_id)) return true
                    if (t.assigned_to === profile.id) return true
                    if (t.owner_type === 'personal' && t.created_by === profile.id) return true
                    return false
                })

                setTasks(relevantTasks)

                // Bygg stations-summaries
                const summaries: StationSummary[] = myStations.map(station => ({
                    id: station.id,
                    name: station.name,
                    tasks: relevantTasks.filter(t => t.station_id === station.id)
                }))
                setStationSummaries(summaries)
            } catch (e) {
                console.error('Error loading area manager data:', e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [profile])

    // Filtrera på aktuell månad
    const getMonthTasks = (taskList: Task[]) => taskList.filter(t => {
        if (t.is_recurring_master) return false
        if (t.recurring_master_id && t.instance_month && t.instance_year) {
            return t.instance_month === currentMonth && t.instance_year === new Date().getFullYear()
        }
        if (t.is_recurring_monthly) return true
        if (t.start_month === currentMonth) return true
        if (t.start_month && t.end_month && t.start_month <= t.end_month) {
            return currentMonth >= t.start_month && currentMonth <= t.end_month
        }
        return false
    })

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const allMonthTasks = getMonthTasks(tasks)
    const selectedStation = stationSummaries.find(s => s.id === selectedStationId)
    const displayTasks = selectedStationId
        ? getMonthTasks(selectedStation?.tasks || [])
        : allMonthTasks

    const totalDone = allMonthTasks.filter(t => t.status === 'done').length
    const totalOverdue = allMonthTasks.filter(t => {
        if (!t.deadline_day || t.status === 'done') return false
        return getDaysUntilDeadline(t.deadline_day).text.includes('sen')
    }).length
    const totalUnassigned = allMonthTasks.filter(t => !t.assigned_to && t.owner_type === 'station').length

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <FolderOpen className="h-7 w-7 text-indigo-600" />
                        Stationsområdesöversikt
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Aggregerad vy för {monthName} — {stationSummaries.length} stationer
                    </p>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1 self-start">
                    <MapPin className="h-3 w-3" />
                    {profile?.user_station_groups?.[0]?.station_group?.name || 'Stationsgrupp'}
                </Badge>
            </div>

            {/* Aggregerade siffror */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold">{totalDone}/{allMonthTasks.length}</div>
                                <div className="text-xs text-muted-foreground mt-1">✓ Klara uppgifter</div>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-200" />
                        </div>
                        {allMonthTasks.length > 0 && (
                            <div className="mt-2 bg-secondary h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-green-500 h-full transition-all"
                                    style={{ width: `${Math.round((totalDone / allMonthTasks.length) * 100)}%` }}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className={totalOverdue > 0 ? 'border-orange-200' : ''}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className={`text-2xl font-bold ${totalOverdue > 0 ? 'text-orange-600' : ''}`}>
                                    {totalOverdue}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">⚠️ Försenade</div>
                            </div>
                            <AlertCircle className="h-8 w-8 text-orange-200" />
                        </div>
                    </CardContent>
                </Card>

                <Card className={totalUnassigned > 0 ? 'border-orange-200' : ''}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className={`text-2xl font-bold ${totalUnassigned > 0 ? 'text-orange-600' : ''}`}>
                                    {totalUnassigned}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">👤 Ej tilldelade</div>
                            </div>
                            <UserX className="h-8 w-8 text-orange-200" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold">
                                    {allMonthTasks.length > 0
                                        ? Math.round((totalDone / allMonthTasks.length) * 100)
                                        : 0}%
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">📊 Slutförandegrad</div>
                            </div>
                            <TrendingUp className="h-8 w-8 text-blue-200" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Stationskort */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        Stationer — {monthName}
                    </h2>
                    {selectedStationId && (
                        <Button variant="ghost" size="sm" onClick={() => setSelectedStationId(null)}>
                            Visa alla stationer
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {stationSummaries.map(station => {
                        const stationMonthTasks = getMonthTasks(station.tasks)
                        const done = stationMonthTasks.filter(t => t.status === 'done').length
                        const total = stationMonthTasks.length
                        const pct = total > 0 ? Math.round((done / total) * 100) : 0
                        const overdue = stationMonthTasks.filter(t => {
                            if (!t.deadline_day || t.status === 'done') return false
                            return getDaysUntilDeadline(t.deadline_day).text.includes('sen')
                        }).length
                        const unassigned = stationMonthTasks.filter(t => !t.assigned_to && t.owner_type === 'station').length
                        const isSelected = selectedStationId === station.id

                        return (
                            <Card
                                key={station.id}
                                className={`cursor-pointer transition-all hover:shadow-md ${isSelected
                                    ? 'border-primary ring-1 ring-primary bg-primary/5'
                                    : overdue > 0 || unassigned > 0
                                        ? 'border-orange-200'
                                        : ''
                                    }`}
                                onClick={() => setSelectedStationId(isSelected ? null : station.id)}
                            >
                                <CardHeader className="pb-2 pt-4">
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span>{station.name}</span>
                                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pb-4">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="font-medium">{done}/{total} klara</span>
                                        <span className="text-muted-foreground">{pct}%</span>
                                    </div>
                                    <div className="bg-secondary h-2 rounded-full overflow-hidden mb-3">
                                        <div
                                            className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : 'bg-orange-400'}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        {overdue > 0 && (
                                            <Badge variant="outline" className="text-xs border-orange-300 text-orange-600 gap-1">
                                                <AlertTriangle className="h-3 w-3" />
                                                {overdue} försenade
                                            </Badge>
                                        )}
                                        {unassigned > 0 && (
                                            <Badge variant="outline" className="text-xs border-orange-300 text-orange-600 gap-1">
                                                <UserX className="h-3 w-3" />
                                                {unassigned} ej tilldelade
                                            </Badge>
                                        )}
                                        {overdue === 0 && unassigned === 0 && total > 0 && (
                                            <Badge variant="outline" className="text-xs border-green-300 text-green-600">
                                                ✓ Allt ok
                                            </Badge>
                                        )}
                                        {total === 0 && (
                                            <span className="text-xs text-muted-foreground">Inga uppgifter</span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </section>

            {/* Uppgiftslista */}
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">
                        {selectedStation
                            ? `Uppgifter — ${selectedStation.name}`
                            : `Alla uppgifter — ${monthName}`}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                        ({displayTasks.filter(t => t.status !== 'done').length} aktiva)
                    </span>
                </div>

                {displayTasks.filter(t => t.status !== 'done').length === 0 ? (
                    <div className="text-center py-12 bg-secondary/30 rounded-lg">
                        <p className="text-muted-foreground">Inga aktiva uppgifter</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {displayTasks.filter(t => t.status !== 'done').map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onStatusChange={onStatusChange}
                                onPriorityChange={onPriorityChange}
                            />
                        ))}
                    </div>
                )}

                {displayTasks.filter(t => t.status === 'done').length > 0 && (
                    <>
                        <div className="flex items-center gap-2 mt-6">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <h3 className="text-lg font-semibold">Klara uppgifter</h3>
                            <span className="text-sm text-muted-foreground">
                                ({displayTasks.filter(t => t.status === 'done').length})
                            </span>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {displayTasks.filter(t => t.status === 'done').map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onStatusChange={onStatusChange}
                                    onPriorityChange={onPriorityChange}
                                />
                            ))}
                        </div>
                    </>
                )}
            </section>
        </div>
    )
}
