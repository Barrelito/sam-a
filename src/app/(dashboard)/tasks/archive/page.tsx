"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Task } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import {
    Loader2,
    Search,
    Calendar,
    Paperclip,
    MapPin,
    Building2,
    Archive,
    Download,
    FileText
} from "lucide-react"
import { categoryLabels, categoryColors } from "@/lib/types"

export default function TaskArchivePage() {
    const router = useRouter()
    const { profile, loading: authLoading } = useAuth()
    const [tasks, setTasks] = useState<Task[]>([])
    const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [monthsBack, setMonthsBack] = useState(12)

    useEffect(() => {
        loadArchivedTasks()
    }, [])

    useEffect(() => {
        filterTasks()
    }, [searchQuery, monthsBack, tasks])

    const loadArchivedTasks = async () => {
        try {
            const res = await fetch('/api/tasks?status=done')
            if (!res.ok) throw new Error('Failed to load tasks')
            const data = await res.json()
            setTasks(data.tasks || [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const filterTasks = () => {
        let filtered = [...tasks]

        // Filter by date (months back)
        const cutoffDate = new Date()
        cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack)
        filtered = filtered.filter(task => {
            if (!task.completed_at) return false
            return new Date(task.completed_at) >= cutoffDate
        })

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(task =>
                task.title.toLowerCase().includes(query) ||
                task.description?.toLowerCase().includes(query) ||
                task.station?.name?.toLowerCase().includes(query)
            )
        }

        setFilteredTasks(filtered)
    }

    // Group tasks by month
    const groupedTasks = filteredTasks.reduce((groups, task) => {
        if (!task.completed_at) return groups

        const date = new Date(task.completed_at)
        const monthYear = date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long' })

        if (!groups[monthYear]) {
            groups[monthYear] = []
        }
        groups[monthYear].push(task)
        return groups
    }, {} as Record<string, Task[]>)

    // Sort month groups (newest first)
    const sortedMonths = Object.keys(groupedTasks).sort((a, b) => {
        const dateA = new Date(groupedTasks[a][0].completed_at!)
        const dateB = new Date(groupedTasks[b][0].completed_at!)
        return dateB.getTime() - dateA.getTime()
    })

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Archive className="h-8 w-8" />
                        Uppgiftsarkiv
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Sök och hitta avklarade uppgifter med tillhörande dokument
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Filter och sök</CardTitle>
                    <CardDescription>Anpassa visningen för att hitta vad du söker</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Search */}
                        <div className="space-y-2">
                            <Label htmlFor="search">Sök uppgift</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    placeholder="Sök efter titel, beskrivning eller station..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Date range */}
                        <div className="space-y-2">
                            <Label htmlFor="months">Visa uppgifter från senaste</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="months"
                                    type="number"
                                    min={1}
                                    max={60}
                                    value={monthsBack}
                                    onChange={(e) => setMonthsBack(parseInt(e.target.value) || 12)}
                                    className="w-24"
                                />
                                <span className="text-sm text-muted-foreground">månader</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setMonthsBack(12)}
                                >
                                    Återställ
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">
                            Visar <span className="font-medium text-foreground">{filteredTasks.length}</span> av{' '}
                            <span className="font-medium text-foreground">{tasks.length}</span> avklarade uppgifter
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Grouped Tasks */}
            {sortedMonths.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        Inga avklarade uppgifter hittades för den valda perioden
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {sortedMonths.map(monthYear => (
                        <Card key={monthYear}>
                            <CardHeader className="bg-muted/30">
                                <CardTitle className="text-xl flex items-center gap-2 capitalize">
                                    <Calendar className="h-5 w-5" />
                                    {monthYear}
                                </CardTitle>
                                <CardDescription>
                                    {groupedTasks[monthYear].length} uppgift{groupedTasks[monthYear].length !== 1 ? 'er' : ''}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    {groupedTasks[monthYear].map(task => (
                                        <div
                                            key={task.id}
                                            className="p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                                            onClick={() => router.push(`/tasks/${task.id}`)}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 space-y-2">
                                                    {/* Title and badges */}
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-medium">{task.title}</h3>
                                                        <Badge variant="outline" className={categoryColors[task.category]}>
                                                            {categoryLabels[task.category]}
                                                        </Badge>
                                                        {task.attachments && task.attachments.length > 0 && (
                                                            <Badge variant="secondary" className="gap-1">
                                                                <Paperclip className="h-3 w-3" />
                                                                {task.attachments.length}
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {/* Description */}
                                                    {task.description && (
                                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                                            {task.description}
                                                        </p>
                                                    )}

                                                    {/* Meta info */}
                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                        {task.station?.name && (
                                                            <div className="flex items-center gap-1">
                                                                <MapPin className="h-3 w-3" />
                                                                {task.station.name}
                                                            </div>
                                                        )}
                                                        {task.verksamhetsomraden?.name && (
                                                            <div className="flex items-center gap-1">
                                                                <Building2 className="h-3 w-3" />
                                                                {task.verksamhetsomraden.name}
                                                            </div>
                                                        )}
                                                        {task.completed_at && (
                                                            <div className="flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                Avslutad {new Date(task.completed_at).toLocaleDateString('sv-SE')}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Attachments */}
                                                    {task.attachments && task.attachments.length > 0 && (
                                                        <div className="pt-2 border-t">
                                                            <p className="text-xs font-medium text-muted-foreground mb-2">Bilagor:</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {task.attachments.map(attachment => (
                                                                    <div
                                                                        key={attachment.id}
                                                                        className="flex items-center gap-1.5 px-2 py-1 bg-secondary/50 rounded text-xs"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            // TODO: Download file
                                                                        }}
                                                                    >
                                                                        <FileText className="h-3 w-3" />
                                                                        <span className="max-w-[200px] truncate">
                                                                            {attachment.filename}
                                                                        </span>
                                                                        <Download className="h-3 w-3 ml-1" />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
