"use client"

import { useState, useEffect } from "react"
import { Task, TaskCategory, TaskOwnerType, categoryLabels, ownerTypeLabels } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2, MapPin, FolderOpen } from "lucide-react"

interface Station {
    id: string
    name: string
    vo_id: string
}

interface StationGroup {
    id: string
    name: string
    vo_id: string
    stations?: { id: string; name?: string }[]
}

interface EditTaskDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    task: Task
    onSave: (updates: Partial<Task>) => Promise<void>
    userRole: 'admin' | 'vo_chief' | 'station_manager' | 'assistant_manager'
    userStations?: Station[]
}

const categories: TaskCategory[] = ['HR', 'Finance', 'Safety', 'Operations']
const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const monthNames: Record<number, string> = {
    1: 'Januari', 2: 'Februari', 3: 'Mars', 4: 'April',
    5: 'Maj', 6: 'Juni', 7: 'Juli', 8: 'Augusti',
    9: 'September', 10: 'Oktober', 11: 'November', 12: 'December'
}

export function EditTaskDialog({
    open,
    onOpenChange,
    task,
    onSave,
    userRole,
    userStations = []
}: EditTaskDialogProps) {
    const [loading, setLoading] = useState(false)
    const [stations, setStations] = useState<Station[]>([])
    const [stationGroups, setStationGroups] = useState<StationGroup[]>([])

    // Form state
    const [title, setTitle] = useState(task.title)
    const [description, setDescription] = useState(task.description || '')
    const [category, setCategory] = useState<TaskCategory>(task.category)
    const [stationId, setStationId] = useState(task.station_id || '')
    const [stationGroupId, setStationGroupId] = useState(task.station_group_id || '')
    const [assignmentType, setAssignmentType] = useState<'station' | 'group'>(
        task.station_group_id ? 'group' : 'station'
    )
    const [startMonth, setStartMonth] = useState(task.start_month?.toString() || '')
    const [endMonth, setEndMonth] = useState(task.end_month?.toString() || '')
    const [isRecurringMonthly, setIsRecurringMonthly] = useState(task.is_recurring_monthly)
    const [deadlineDay, setDeadlineDay] = useState(task.deadline_day.toString())

    // Load stations and station groups
    useEffect(() => {
        if (open) {
            // Load stations
            if (userStations.length > 0) {
                setStations(userStations)
            } else {
                fetch('/api/admin/stations')
                    .then(res => res.json())
                    .then(data => setStations(data.stations || []))
                    .catch(err => console.error('Failed to load stations:', err))
            }

            // Load station groups
            fetch('/api/admin/station-groups')
                .then(res => res.json())
                .then(data => setStationGroups(data.station_groups || []))
                .catch(err => console.error('Failed to load station groups:', err))

            // Reset form to task values
            setTitle(task.title)
            setDescription(task.description || '')
            setCategory(task.category)
            setStationId(task.station_id || '')
            setStationGroupId(task.station_group_id || '')
            setAssignmentType(task.station_group_id ? 'group' : 'station')
            setStartMonth(task.start_month?.toString() || '')
            setEndMonth(task.end_month?.toString() || '')
            setIsRecurringMonthly(task.is_recurring_monthly)
            setDeadlineDay(task.deadline_day.toString())
        }
    }, [open, task, userStations])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await onSave({
                title,
                description: description || null,
                category,
                station_id: assignmentType === 'station' ? stationId || null : null,
                station_group_id: assignmentType === 'group' ? stationGroupId || null : null,
                start_month: isRecurringMonthly ? null : (startMonth ? parseInt(startMonth) : null),
                end_month: isRecurringMonthly ? null : (endMonth ? parseInt(endMonth) : null),
                is_recurring_monthly: isRecurringMonthly,
                deadline_day: parseInt(deadlineDay) || 25,
            })
            onOpenChange(false)
        } catch (err) {
            console.error('Failed to save task:', err)
        } finally {
            setLoading(false)
        }
    }

    const canEditStation = userRole === 'admin' || userRole === 'vo_chief' || userRole === 'station_manager'
    const showStationGroups = stationGroups.length > 0

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Redigera Uppgift</DialogTitle>
                    <DialogDescription>
                        Ändra uppgiftens information. Alla fält märkta med * är obligatoriska.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Titel *</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Uppgiftens titel"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Beskrivning</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Valfri beskrivning"
                            rows={3}
                        />
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <Label>Kategori *</Label>
                        <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => (
                                    <SelectItem key={cat} value={cat}>
                                        {categoryLabels[cat]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Station/Group Assignment */}
                    {canEditStation && task.owner_type === 'station' && (
                        <div className="space-y-3">
                            <Label>Tilldelning</Label>

                            {/* Assignment type toggle */}
                            {showStationGroups && (
                                <div className="flex gap-2">
                                    <Badge
                                        variant={assignmentType === 'station' ? 'default' : 'outline'}
                                        className="cursor-pointer"
                                        onClick={() => {
                                            setAssignmentType('station')
                                            setStationGroupId('')
                                        }}
                                    >
                                        <MapPin className="h-3 w-3 mr-1" />
                                        Enskild station
                                    </Badge>
                                    <Badge
                                        variant={assignmentType === 'group' ? 'default' : 'outline'}
                                        className="cursor-pointer"
                                        onClick={() => {
                                            setAssignmentType('group')
                                            setStationId('')
                                        }}
                                    >
                                        <FolderOpen className="h-3 w-3 mr-1" />
                                        Stationsområde
                                    </Badge>
                                </div>
                            )}

                            {/* Station select */}
                            {assignmentType === 'station' && (
                                <Select value={stationId} onValueChange={setStationId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Välj station" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stations.map(station => (
                                            <SelectItem key={station.id} value={station.id}>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-4 w-4" />
                                                    {station.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {/* Station Group select */}
                            {assignmentType === 'group' && showStationGroups && (
                                <Select value={stationGroupId} onValueChange={setStationGroupId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Välj stationsområde" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stationGroups.map(group => (
                                            <SelectItem key={group.id} value={group.id}>
                                                <div className="flex items-center gap-2">
                                                    <FolderOpen className="h-4 w-4" />
                                                    <span>{group.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        ({group.stations?.length || 0} stationer)
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    )}

                    {/* Recurring Monthly Toggle */}
                    <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div>
                            <Label htmlFor="recurring">Återkommande varje månad</Label>
                            <p className="text-xs text-muted-foreground">
                                Uppgiften gäller varje månad
                            </p>
                        </div>
                        <Switch
                            id="recurring"
                            checked={isRecurringMonthly}
                            onCheckedChange={setIsRecurringMonthly}
                        />
                    </div>

                    {/* Month Selection (if not recurring) */}
                    {!isRecurringMonthly && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Startmånad</Label>
                                <Select value={startMonth} onValueChange={setStartMonth}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Välj månad" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map(month => (
                                            <SelectItem key={month} value={month.toString()}>
                                                {monthNames[month]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Slutmånad</Label>
                                <Select value={endMonth} onValueChange={setEndMonth}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Samma som start" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months
                                            .filter(m => !startMonth || m >= parseInt(startMonth))
                                            .map(month => (
                                                <SelectItem key={month} value={month.toString()}>
                                                    {monthNames[month]}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Deadline Day */}
                    <div className="space-y-2">
                        <Label htmlFor="deadline_day">Deadline (dag i månaden)</Label>
                        <Input
                            id="deadline_day"
                            type="number"
                            min={1}
                            max={31}
                            value={deadlineDay}
                            onChange={(e) => setDeadlineDay(e.target.value)}
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Avbryt
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Spara ändringar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
