"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, AlertCircle } from "lucide-react"

interface Station {
    id: string
    name: string
    vo_id: string
    verksamhetsomraden?: { id: string; name: string }
}

interface VO {
    id: string
    name: string
}

interface StationGroup {
    id: string
    name: string
    description: string | null
    vo_id: string
    stations?: Station[]
}

interface StationGroupDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    editGroup?: StationGroup | null
    voList: VO[]
    stationList: Station[]
}

export function StationGroupDialog({
    open,
    onOpenChange,
    onSuccess,
    editGroup,
    voList,
    stationList
}: StationGroupDialogProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form data
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [voId, setVoId] = useState<string>("")
    const [stationIds, setStationIds] = useState<string[]>([])

    const isEditing = !!editGroup

    // Populate form when editing
    useEffect(() => {
        if (editGroup) {
            setName(editGroup.name)
            setDescription(editGroup.description || "")
            setVoId(editGroup.vo_id)
            setStationIds(editGroup.stations?.map(s => s.id) || [])
        } else {
            resetForm()
        }
    }, [editGroup, open])

    const resetForm = () => {
        setName("")
        setDescription("")
        setVoId("")
        setStationIds([])
        setError(null)
    }

    const handleClose = () => {
        resetForm()
        onOpenChange(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (stationIds.length < 2) {
                throw new Error('Ett stationsområde måste innehålla minst 2 stationer')
            }

            const payload = {
                name,
                description: description || null,
                vo_id: voId,
                station_ids: stationIds
            }

            const url = isEditing
                ? `/api/admin/station-groups/${editGroup.id}`
                : '/api/admin/station-groups'

            const res = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Något gick fel')
            }

            onSuccess()
            handleClose()

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleStationToggle = (stationId: string) => {
        setStationIds(prev =>
            prev.includes(stationId)
                ? prev.filter(id => id !== stationId)
                : [...prev, stationId]
        )
    }

    // Filter stations by selected VO
    const filteredStations = voId
        ? stationList.filter(s => s.vo_id === voId)
        : stationList

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Redigera Stationsområde' : 'Skapa Stationsområde'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Uppdatera stationsområdets information och stationer.'
                            : 'Skapa ett nytt stationsområde med minst 2 stationer.'
                        }
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        {error && (
                            <div className="p-3 bg-destructive/10 rounded-lg flex items-center gap-2 text-destructive">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        {/* Name */}
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">
                                Namn <span className="text-destructive">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="t.ex. Roslagen"
                                required
                                className="w-full px-3 py-2 border rounded-lg bg-background"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">
                                Beskrivning
                            </label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Valfri beskrivning av stationsområdet..."
                                rows={2}
                                className="w-full px-3 py-2 border rounded-lg bg-background resize-none"
                            />
                        </div>

                        {/* VO Area */}
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">
                                Verksamhetsområde <span className="text-destructive">*</span>
                            </label>
                            <select
                                value={voId}
                                onChange={e => {
                                    setVoId(e.target.value)
                                    // Reset stations when VO changes
                                    setStationIds([])
                                }}
                                required
                                disabled={isEditing}
                                className="w-full px-3 py-2 border rounded-lg bg-background disabled:opacity-50"
                            >
                                <option value="">Välj VO-område...</option>
                                {voList.map(vo => (
                                    <option key={vo.id} value={vo.id}>{vo.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Stations */}
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">
                                Stationer <span className="text-destructive">*</span>
                                <span className="text-muted-foreground font-normal ml-2">
                                    (minst 2)
                                </span>
                            </label>
                            {filteredStations.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    {voId ? 'Inga stationer i valt VO-område' : 'Välj VO-område först'}
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {filteredStations.map(station => (
                                        <Badge
                                            key={station.id}
                                            variant={stationIds.includes(station.id) ? "default" : "outline"}
                                            className="cursor-pointer transition-colors"
                                            onClick={() => handleStationToggle(station.id)}
                                        >
                                            {station.name}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            {stationIds.length > 0 && stationIds.length < 2 && (
                                <p className="text-xs text-amber-600 mt-2">
                                    ⚠️ Välj minst 2 stationer
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Avbryt
                        </Button>
                        <Button type="submit" disabled={loading || stationIds.length < 2}>
                            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {isEditing ? 'Spara' : 'Skapa Område'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
