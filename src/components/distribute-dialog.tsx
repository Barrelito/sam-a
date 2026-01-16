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
import { Loader2, MapPin, User, Check, AlertCircle } from "lucide-react"

interface Station {
    id: string
    name: string
    vo_id: string
}

interface Manager {
    id: string
    full_name: string
    email: string
    station_ids: string[]
}

interface DistributionTarget {
    station_id: string
    assigned_to?: string
}

interface DistributeDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    task: {
        id: string
        title: string
        vo_id: string
    }
    onSuccess: () => void
}

export function DistributeDialog({
    open,
    onOpenChange,
    task,
    onSuccess
}: DistributeDialogProps) {
    const [loading, setLoading] = useState(false)
    const [dataLoading, setDataLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const [stations, setStations] = useState<Station[]>([])
    const [managers, setManagers] = useState<Manager[]>([])
    const [alreadyDistributed, setAlreadyDistributed] = useState<Set<string>>(new Set())

    const [selected, setSelected] = useState<Record<string, DistributionTarget>>({})

    // Load stations, managers, and current distribution status
    useEffect(() => {
        if (open && task.id) {
            setDataLoading(true)
            setError(null)
            setSuccess(null)

            Promise.all([
                fetch('/api/admin/stations').then(r => r.json()),
                fetch('/api/admin/users').then(r => r.json()),
                fetch(`/api/tasks/${task.id}/distribute`).then(r => r.json()),
            ])
                .then(([stationsData, usersData, distributeData]) => {
                    // Filter stations by VO
                    const voStations = stationsData.stations?.filter(
                        (s: Station) => s.vo_id === task.vo_id
                    ) || []
                    setStations(voStations)

                    // Get station managers in this VO
                    const voManagers = usersData.profiles?.filter((u: any) =>
                        (u.role === 'station_manager' || u.role === 'assistant_manager') &&
                        u.vo_id === task.vo_id
                    ).map((u: any) => ({
                        id: u.id,
                        full_name: u.full_name,
                        email: u.email,
                        station_ids: u.user_stations?.map((us: any) => us.station?.id).filter(Boolean) || []
                    })) || []
                    setManagers(voManagers)

                    // Get already distributed stations
                    const distributed = new Set<string>(
                        distributeData.childTasks?.map((t: any) => t.station_id) || []
                    )
                    setAlreadyDistributed(distributed)

                    // Pre-select stations that aren't yet distributed
                    // And auto-assign manager if station has only one
                    const initialSelected: Record<string, DistributionTarget> = {}
                    voStations.forEach((station: Station) => {
                        if (!distributed.has(station.id)) {
                            // Find managers for this station
                            const stationManagerIds = voManagers.filter((m: Manager) =>
                                m.station_ids.includes(station.id)
                            )
                            // Auto-select if exactly one manager
                            const autoAssign = stationManagerIds.length === 1
                                ? stationManagerIds[0].id
                                : undefined

                            initialSelected[station.id] = {
                                station_id: station.id,
                                assigned_to: autoAssign
                            }
                        }
                    })
                    setSelected(initialSelected)
                })
                .catch(err => {
                    console.error('Error loading data:', err)
                    setError('Kunde inte ladda data')
                })
                .finally(() => setDataLoading(false))
        }
    }, [open, task.id, task.vo_id])

    const handleToggleStation = (stationId: string) => {
        setSelected(prev => {
            const newSelected = { ...prev }
            if (newSelected[stationId]) {
                delete newSelected[stationId]
            } else {
                newSelected[stationId] = { station_id: stationId }
            }
            return newSelected
        })
    }

    const handleAssign = (stationId: string, userId: string) => {
        setSelected(prev => ({
            ...prev,
            [stationId]: {
                ...prev[stationId],
                station_id: stationId,
                assigned_to: userId || undefined
            }
        }))
    }

    const handleDistribute = async () => {
        const targets = Object.values(selected)
        if (targets.length === 0) {
            setError('Välj minst en station')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const res = await fetch(`/api/tasks/${task.id}/distribute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targets })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Något gick fel')
            }

            setSuccess(data.message)
            setTimeout(() => {
                onSuccess()
                onOpenChange(false)
            }, 1500)

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const getManagersForStation = (stationId: string) => {
        return managers.filter(m => m.station_ids.includes(stationId))
    }

    const selectedCount = Object.keys(selected).length
    const availableCount = stations.filter(s => !alreadyDistributed.has(s.id)).length

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        Fördela till stationer
                    </DialogTitle>
                    <DialogDescription>
                        Välj vilka stationer som ska utföra "<strong>{task.title}</strong>"
                    </DialogDescription>
                </DialogHeader>

                {dataLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : success ? (
                    <div className="py-6 text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Check className="h-6 w-6 text-green-600" />
                        </div>
                        <p className="text-green-600 font-medium">{success}</p>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="p-3 bg-destructive/10 rounded-lg flex items-center gap-2 text-destructive">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <div className="space-y-3 max-h-[400px] overflow-y-auto py-2">
                            {stations.map(station => {
                                const isDistributed = alreadyDistributed.has(station.id)
                                const isSelected = !!selected[station.id]
                                const stationManagers = getManagersForStation(station.id)

                                return (
                                    <div
                                        key={station.id}
                                        className={`p-3 border rounded-lg transition-colors ${isDistributed
                                            ? 'bg-secondary/30 opacity-60'
                                            : isSelected
                                                ? 'border-primary bg-primary/5'
                                                : 'hover:bg-secondary/50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    disabled={isDistributed}
                                                    onChange={() => handleToggleStation(station.id)}
                                                    className="w-4 h-4 rounded border-gray-300"
                                                />
                                                <span className="font-medium">{station.name}</span>
                                            </label>
                                            {isDistributed && (
                                                <Badge variant="secondary" className="text-xs">
                                                    Redan fördelad
                                                </Badge>
                                            )}
                                        </div>

                                        {isSelected && !isDistributed && (
                                            <div className="mt-2 ml-7">
                                                <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                                    <User className="h-3 w-3" />
                                                    Tilldela ansvarig
                                                </label>
                                                <select
                                                    value={selected[station.id]?.assigned_to || ''}
                                                    onChange={(e) => handleAssign(station.id, e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border rounded bg-background"
                                                >
                                                    <option value="">Ingen tilldelad</option>
                                                    {stationManagers.map(manager => (
                                                        <option key={manager.id} value={manager.id}>
                                                            {manager.full_name}
                                                        </option>
                                                    ))}
                                                    {stationManagers.length === 0 && (
                                                        <option disabled>Inga chefer på denna station</option>
                                                    )}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            {stations.length === 0 && (
                                <p className="text-center text-muted-foreground py-4">
                                    Inga stationer i detta verksamhetsområde
                                </p>
                            )}
                        </div>

                        <DialogFooter>
                            <div className="flex items-center justify-between w-full">
                                <span className="text-sm text-muted-foreground">
                                    {selectedCount} av {availableCount} valda
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => onOpenChange(false)}
                                    >
                                        Avbryt
                                    </Button>
                                    <Button
                                        onClick={handleDistribute}
                                        disabled={loading || selectedCount === 0}
                                    >
                                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                        Fördela ({selectedCount})
                                    </Button>
                                </div>
                            </div>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
