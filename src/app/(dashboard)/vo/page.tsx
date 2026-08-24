"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Task, statusLabels, statusColors, categoryLabels, categoryColors, TaskCategory } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { DistributeDialog } from "@/components/distribute-dialog"
import {
    Building2,
    MapPin,
    Plus,
    Loader2,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Clock,
    ChevronRight,
    ListTodo,
    Share2,
    Users
} from "lucide-react"
import { getMonthName, getCurrentMonth } from "@/lib/utils"
import { mapAnnualCategory } from "@/lib/annual-cycle"

interface Station {
    id: string
    name: string
    vo_id: string
}

interface AnnualCompletion {
    id: string
    annual_cycle_item_id: string
    station_id: string | null
    user_id: string | null
    status: string
    year: number
}

interface StationStats {
    station: Station
    total: number
    done: number
    inProgress: number
    notStarted: number
    percentage: number
}

export default function VODashboardPage() {
    const router = useRouter()
    const { profile, loading: authLoading } = useAuth()

    const [tasks, setTasks] = useState<Task[]>([])
    const [stations, setStations] = useState<Station[]>([])
    const [annualItems, setAnnualItems] = useState<any[]>([])
    const [completions, setCompletions] = useState<AnnualCompletion[]>([])
    const [loading, setLoading] = useState(true)

    // Distribution dialog state
    const [distributeTask, setDistributeTask] = useState<Task | null>(null)

    // Show all tasks to distribute
    const [showAllToDistribute, setShowAllToDistribute] = useState(false)

    const currentMonth = getCurrentMonth()
    const monthName = getMonthName(currentMonth)

    const loadData = async () => {
        try {
            const year = new Date().getFullYear()
            const [tasksRes, stationsRes, annualItemsRes, completionsRes] = await Promise.all([
                fetch(`/api/tasks?year=${year}`),
                fetch('/api/admin/stations'),
                fetch('/api/annual-cycle/items'), // Fetch ALL items for filtering
                fetch(`/api/annual-cycle/completions?year=${year}`) // Station-reported status (RLS: this VO)
            ])

            if (tasksRes.ok) {
                const data = await tasksRes.json()
                setTasks(data.tasks || [])
            }

            if (stationsRes.ok) {
                const data = await stationsRes.json()
                // Filter to only VO's stations
                if (profile?.vo_id) {
                    setStations(data.stations?.filter((s: Station) => s.vo_id === profile.vo_id) || [])
                } else {
                    setStations(data.stations || [])
                }
            }

            if (annualItemsRes.ok) {
                const data = await annualItemsRes.json()
                setAnnualItems(data.items || [])
            }

            if (completionsRes.ok) {
                const data = await completionsRes.json()
                setCompletions(data.completions || [])
            }

        } catch (err) {
            console.error('Failed to load data:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (profile) {
            loadData()
        }
    }, [profile])

    // Redirect if not VO chief or admin
    useEffect(() => {
        if (!authLoading && profile && profile.role !== 'vo_chief' && profile.role !== 'admin') {
            router.push('/')
        }
    }, [authLoading, profile, router])

    if (authLoading || loading || (profile?.role !== 'vo_chief' && profile?.role !== 'admin')) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // --- LOGIC ---

    // 1. Station Tasks (Real work)
    const stationTasks = tasks.filter(t => t.owner_type === 'station')

    // 2. Extrainsatta (VO tasks not linked to the annual cycle)
    // Annual cycle tasks are identified by their annual_cycle_item_id link.
    // Legacy seeded VO tasks may still lack the link (run the backfill migration
    // 20260824120000_backfill_annual_cycle_item_links.sql), so an exact
    // case/whitespace-insensitive title match against the templates also counts.
    const normalizeTitle = (s: string) => s.toLowerCase().trim()
    const annualItemTitles = new Set(annualItems.map(i => normalizeTitle(i.title)))
    const taskById = new Map(tasks.map(t => [t.id, t]))

    const voTasks = tasks.filter(t => t.owner_type === 'vo')
    const tasksToDistribute = voTasks.filter(t => {
        const hasChildren = stationTasks.some(st => st.parent_task_id === t.id)
        if (hasChildren) return false
        if (t.annual_cycle_item_id) return false
        if (annualItemTitles.has(normalizeTitle(t.title))) return false
        return true
    })

    // Does a station task belong to a specific annual cycle item?
    // 1) its own annual_cycle_item_id (materialized tasks)
    // 2) its parent VO task's link (tasks distributed from a seeded VO task)
    // 3) exact title + month match (legacy rows without any link)
    const taskMatchesItem = (t: Task, item: { id: string; title: string; month: number }) => {
        if (t.annual_cycle_item_id) return t.annual_cycle_item_id === item.id
        if (t.parent_task_id) {
            const parent = taskById.get(t.parent_task_id)
            if (parent?.annual_cycle_item_id) return parent.annual_cycle_item_id === item.id
        }
        return normalizeTitle(t.title) === normalizeTitle(item.title) &&
            (t.start_month === item.month || t.is_recurring_monthly)
    }

    // 3. Needs Review
    const needsReview = stationTasks.filter(t => t.status === 'done' && !t.vo_reviewed)

    // 4. Station Stats
    const stationStats: StationStats[] = stations.map(station => {
        // Broad definition: tasks visible in this month
        const sTasks = stationTasks.filter(t => {
            if (t.station_id !== station.id) return false
            if (t.is_recurring_monthly) return true
            if (!t.start_month) return false
            const end = t.end_month || t.start_month
            return currentMonth >= t.start_month && currentMonth <= end
        })

        const done = sTasks.filter(t => t.status === 'done' || t.status === 'reported').length
        const inProgress = sTasks.filter(t => t.status === 'in_progress').length
        const notStarted = sTasks.filter(t => t.status === 'not_started').length
        const total = sTasks.length
        const percentage = total > 0 ? Math.round((done / total) * 100) : 0

        return { station, total, done, inProgress, notStarted, percentage }
    })

    const overallPercentage = Math.round(stationStats.reduce((acc, s) => acc + s.percentage, 0) / (stationStats.length || 1))

    // Filter annual items for display in focused section
    const currentAnnualItems = annualItems.filter(i => i.month === currentMonth)


    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Building2 className="h-8 w-8 text-primary" />
                        VO Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {profile?.verksamhetsomraden?.name || 'Verksamhetsområde'} - Översikt för {monthName}
                    </p>
                </div>
                <Button onClick={() => router.push('/vo/tasks/new')} className="gap-2" variant="outline">
                    <Plus className="h-4 w-4" />
                    Ny extrabeställning
                </Button>
            </div>

            {/* MÅNADENS FOKUS (Annual Cycle Items) */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Månadens Fokus ({monthName})
                </h2>

                {currentAnnualItems.length === 0 ? (
                    <Card className="bg-gray-50 border-dashed">
                        <CardContent className="py-8 text-center text-muted-foreground">
                            Inga specifika årshjulspunkter för denna månad.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {currentAnnualItems.map(item => {
                            // Station progress for this item, from both status stores:
                            // materialized/distributed tasks and station-reported completions
                            const voStationIds = new Set(stations.map(s => s.id))
                            const matchingTasks = stationTasks.filter(t => taskMatchesItem(t, item))
                            const matchingCompletions = completions.filter(c =>
                                c.annual_cycle_item_id === item.id && c.station_id && voStationIds.has(c.station_id)
                            )

                            const startedStationIds = new Set<string>()
                            const completedStationIds = new Set<string>()
                            for (const t of matchingTasks) {
                                if (!t.station_id || !voStationIds.has(t.station_id)) continue
                                startedStationIds.add(t.station_id)
                                if (t.status === 'done' || t.status === 'reported') completedStationIds.add(t.station_id)
                            }
                            for (const c of matchingCompletions) {
                                if (c.status === 'completed' || c.status === 'in_progress') startedStationIds.add(c.station_id!)
                                if (c.status === 'completed') completedStationIds.add(c.station_id!)
                            }

                            const stationsWithTask = startedStationIds.size
                            const stationsCompleted = completedStationIds.size
                            const totalStations = stations.length

                            const percent = totalStations > 0 ? Math.round((stationsWithTask / totalStations) * 100) : 0
                            const completionPercent = totalStations > 0 ? Math.round((stationsCompleted / totalStations) * 100) : 0

                            // Templates use lowercase categories — normalize to TaskCategory for the UI
                            const itemCategory = mapAnnualCategory(item.category)

                            return (
                                <Card key={item.id} className="overflow-hidden">
                                    <div className={`h-1 w-full ${categoryColors[itemCategory]?.replace('text-', 'bg-') || 'bg-gray-200'}`} />
                                    <CardContent className="pt-4">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-medium text-lg">{item.title}</h3>
                                                <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                                            </div>
                                            <Badge variant="outline" className={categoryColors[itemCategory]}>
                                                {categoryLabels[itemCategory]}
                                            </Badge>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-muted-foreground">Startad av stationer</span>
                                                    <span className="font-medium">{stationsWithTask} av {totalStations}</span>
                                                </div>
                                                <Progress value={percent} className="h-1.5" />
                                            </div>

                                            {stationsWithTask > 0 && (
                                                <div>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-muted-foreground">Klar rapporterad</span>
                                                        <span className="font-medium text-green-600">{stationsCompleted} av {totalStations}</span>
                                                    </div>
                                                    <Progress value={completionPercent} className="h-1.5 bg-green-100 [&>div]:bg-green-600" />
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Station Overview */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Stationsöversikt
                </h2>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {stationStats.map(({ station, total, done, inProgress, notStarted, percentage }) => (
                        <Card
                            key={station.id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => router.push(`/vo/station/${station.id}`)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-primary" />
                                        {station.name}
                                    </CardTitle>
                                    <span className="text-2xl font-bold">{percentage}%</span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Progress value={percentage} />
                                <div className="flex justify-between text-sm">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <span>{done} klara</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                        <span>{inProgress}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                                        <span>{notStarted}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Needs Review Section */}
            {needsReview.length > 0 && (
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                            <AlertCircle className="h-5 w-5" />
                            Väntar på granskning ({needsReview.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {needsReview.slice(0, 5).map(task => (
                                <div
                                    key={task.id}
                                    className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:shadow-sm transition-shadow"
                                    onClick={() => router.push(`/tasks/${task.id}`)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="font-medium">{task.title}</p>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <MapPin className="h-3 w-3" />
                                                {task.station?.name}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Extrainsatta tasks (Old 'Att fördela') */}
            <section className="space-y-4 pt-8 border-t">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
                        <Share2 className="h-5 w-5" />
                        Extrainsatta uppgifter att fördela
                    </h2>
                    <div className="flex items-center gap-2">
                        {tasksToDistribute.length > 0 && (
                            <Badge variant="secondary">{tasksToDistribute.length}</Badge>
                        )}
                        <Button onClick={() => router.push('/vo/tasks/new')} variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Ny uppgift
                        </Button>
                    </div>
                </div>

                <Card className="bg-gray-50/50">
                    <CardContent className="pt-6">
                        {tasksToDistribute.length === 0 ? (
                            <div className="text-center py-8 space-y-4">
                                <p className="text-muted-foreground">Inga extrainsatta uppgifter att fördela just nu.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {(showAllToDistribute ? tasksToDistribute : tasksToDistribute.slice(0, 3)).map(task => (
                                    <div key={task.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                        <span className="font-medium text-sm">{task.title}</span>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setDistributeTask(task)}
                                        >
                                            Fördela
                                        </Button>
                                    </div>
                                ))}
                                {tasksToDistribute.length > 3 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-muted-foreground"
                                        onClick={() => setShowAllToDistribute(!showAllToDistribute)}
                                    >
                                        {showAllToDistribute ? 'Visa färre' : 'Visa fler'}
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>

            {/* Distribute Dialog */}
            {distributeTask && (
                <DistributeDialog
                    open={!!distributeTask}
                    onOpenChange={(open) => !open && setDistributeTask(null)}
                    task={{
                        id: distributeTask.id,
                        title: distributeTask.title,
                        vo_id: distributeTask.vo_id!
                    }}
                    onSuccess={() => {
                        setDistributeTask(null)
                        loadData()
                    }}
                />
            )}

        </div>
    )
}
