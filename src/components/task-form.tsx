"use client"

import { useState } from "react"
import { Task, TaskCategory, TaskOwnerType, categoryLabels, ownerTypeLabels } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"

interface Station {
    id: string
    name: string
    vo_id: string
}

interface TaskFormProps {
    initialData?: Partial<Task>
    stations?: Station[]
    voId?: string
    userRole: 'admin' | 'vo_chief' | 'station_manager' | 'assistant_manager'
    onSubmit: (data: Partial<Task>) => Promise<void>
    onCancel: () => void
}

const categories: TaskCategory[] = ['HR', 'Finance', 'Safety', 'Operations']
const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const monthNames: Record<number, string> = {
    1: 'Januari', 2: 'Februari', 3: 'Mars', 4: 'April',
    5: 'Maj', 6: 'Juni', 7: 'Juli', 8: 'Augusti',
    9: 'September', 10: 'Oktober', 11: 'November', 12: 'December'
}

export function TaskForm({
    initialData,
    stations,
    voId,
    userRole,
    onSubmit,
    onCancel
}: TaskFormProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        category: initialData?.category || 'Operations' as TaskCategory,
        owner_type: initialData?.owner_type || (userRole === 'vo_chief' ? 'vo' : 'station') as TaskOwnerType,
        station_id: initialData?.station_id || '',
        start_month: initialData?.start_month?.toString() || '',
        end_month: initialData?.end_month?.toString() || '',
        is_recurring_monthly: initialData?.is_recurring_monthly || false,
        deadline_day: initialData?.deadline_day?.toString() || '25',
        year: initialData?.year || new Date().getFullYear(),
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await onSubmit({
                title: formData.title,
                description: formData.description || null,
                category: formData.category,
                owner_type: formData.owner_type,
                station_id: formData.owner_type === 'station' ? formData.station_id : null,
                vo_id: voId,
                start_month: formData.is_recurring_monthly ? null : (formData.start_month ? parseInt(formData.start_month) : null),
                end_month: formData.is_recurring_monthly ? null : (formData.end_month ? parseInt(formData.end_month) : null),
                is_recurring_monthly: formData.is_recurring_monthly,
                deadline_day: parseInt(formData.deadline_day) || 25,
                year: formData.year,
            })
        } finally {
            setLoading(false)
        }
    }

    // Determine available owner types based on user role
    const availableOwnerTypes: TaskOwnerType[] = []
    if (userRole === 'admin') {
        availableOwnerTypes.push('vo', 'station', 'personal')
    } else if (userRole === 'vo_chief') {
        availableOwnerTypes.push('vo', 'personal')
    } else {
        availableOwnerTypes.push('station')
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
                <Label htmlFor="title">Titel *</Label>
                <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ange uppgiftens titel"
                    required
                />
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Label htmlFor="description">Beskrivning</Label>
                <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Valfri beskrivning"
                    rows={3}
                />
            </div>

            {/* Category */}
            <div className="space-y-2">
                <Label htmlFor="category">Kategori *</Label>
                <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as TaskCategory })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Välj kategori" />
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

            {/* Owner Type */}
            {availableOwnerTypes.length > 1 && (
                <div className="space-y-2">
                    <Label htmlFor="owner_type">Uppgiftstyp *</Label>
                    <Select
                        value={formData.owner_type}
                        onValueChange={(value) => setFormData({ ...formData, owner_type: value as TaskOwnerType })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Välj typ" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableOwnerTypes.map(type => (
                                <SelectItem key={type} value={type}>
                                    {ownerTypeLabels[type]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Station (if station task) */}
            {formData.owner_type === 'station' && stations && stations.length > 0 && (
                <div className="space-y-2">
                    <Label htmlFor="station_id">Station *</Label>
                    <Select
                        value={formData.station_id}
                        onValueChange={(value) => setFormData({ ...formData, station_id: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Välj station" />
                        </SelectTrigger>
                        <SelectContent>
                            {stations.map(station => (
                                <SelectItem key={station.id} value={station.id}>
                                    {station.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Recurring Monthly Toggle */}
            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                    <Label htmlFor="recurring">Återkommande varje månad</Label>
                    <p className="text-sm text-muted-foreground">
                        Uppgiften gäller varje månad under hela året
                    </p>
                </div>
                <Switch
                    id="recurring"
                    checked={formData.is_recurring_monthly}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_recurring_monthly: checked })}
                />
            </div>

            {/* Month Selection (if not recurring) */}
            {!formData.is_recurring_monthly && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="start_month">Startmånad</Label>
                        <Select
                            value={formData.start_month}
                            onValueChange={(value) => setFormData({ ...formData, start_month: value })}
                        >
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
                        <Label htmlFor="end_month">Slutmånad</Label>
                        <Select
                            value={formData.end_month}
                            onValueChange={(value) => setFormData({ ...formData, end_month: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Samma som start" />
                            </SelectTrigger>
                            <SelectContent>
                                {months
                                    .filter(m => !formData.start_month || m >= parseInt(formData.start_month))
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
                    value={formData.deadline_day}
                    onChange={(e) => setFormData({ ...formData, deadline_day: e.target.value })}
                />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                    Avbryt
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {initialData?.id ? 'Spara ändringar' : 'Skapa uppgift'}
                </Button>
            </div>
        </form>
    )
}
