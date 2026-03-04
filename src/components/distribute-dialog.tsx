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
import { Loader2, MapPin, User, Check, AlertCircle, FolderOpen } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

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
    const { profile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [dataLoading, setDataLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const [stations, setStations] = useState<Station[]>([])
    const [managers, setManagers] = useState<Manager[]>([])
    const [alreadyDistributed, setAlreadyDistributed] = useState<Set<string>>(new Set())
    const [selected, setSelected] = useState<Record<string, DistributionTarget>>({})

    const isAreaManager = profile?.role === 'area_manager'
    const areaLabel = isAreaManager ? 'stationsområde' : 'verksamhetsområde'

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
                    let availableStations: Station[] = []

                    if (isAreaManager) {
                        // Area manager: only show stations in their station_group(s)
                        const stationGroupMembers = profile?.user_station_groups?.flatMap(
                            usg => usg.station_group ? [usg.station_group.id] : []
                        ) || []

                        // Get station IDs from the distribute data (which now has station_group context)
                        // Fall back: filter stations by cross-referencing with what API allows
                        // We'll filter by checking distributeData.notDistributed + distributeData.childTasks
                        const knownIds = new Set([
                            ...(distributeData.childTasks?.map((t: any) => t.station_id) || []),
                            ...(distributeData.notDistributed?.map((s: any) => s.id) || []),
                        ])
                        availableStations = stationsData.stations?.filter(
                            (s: Station) => knownIds.has(s.id) || s.vo_id === task.vo_id
                        ) || []

                        // For area manager: use notDistributed from API as the source of truth
                        // since the backend knows their station_group
                        const approvedIds = new Set([
                            ...(distributeData.notDistributed?.map((s: any) => s.id) || []),
                            ...(distributeData.childTasks?.map((t: any) => t.station_id) || []),
                        ])
                        availableStations = stationsData.stations?.filter(
                            (s: Station) => approvedIds.has(s.id)
                        ) || []

                    } else {
                        // VO chief: all stations in this VO
                        availableStations = stationsData.stations?.filter(
                            (s: Station) => s.vo_id === task.vo_id
                        ) || []
                    }

                    const availableStationIds = new Set(availableStations.map((s: Station) => s.id))

                    // Bygg managers-lista
                    const voManagers = usersData.profiles?.filter((u: any) => {
                        if (!['station_manager', 'assistant_manager', 'area_manager'].includes(u.role)) return false
                        if (u.role === 'area_manager') return true
                        const managerStationIds = u.user_stations?.map((us: any) => us.station?.id).filter(Boolean) || []
                        return managerStationIds.some((id: string) => availableStationIds.has(id))
                    }).map((u: any) => ({
                        id: u.id,
                        full_name: u.full_name + (u.role === 'area_manager' ? ' (SO-chef)' : ''),
                        email: u.email,
                        station_ids: u.user_stations?.map((us: any) => us.station?.id).filter(Boolean) || []
                    })) || []
                    setManagers(voManagers)

                    // Bygg map: station_id → child task (inkl. befintlig assignee)
                    const childTaskMap = new Map<string, any>(
                        (distributeData.childTasks || []).map((t: any) => [t.station_id, t])
                    )

                    const distributed = new Set<string>(childTaskMap.keys())
                    setAlreadyDistributed(distributed)

                    // Pre-select ALLA stationer — inte bara ej-fördelade
                    // Fördelade stationer: behåll befintlig assignee
                    // Ej fördelade: auto-tilldela om en unik stationschef finns
                    const initialSelected: Record<string, DistributionTarget> = {}
                    availableStations.forEach((station: Station) => {
                        const existingChild = childTaskMap.get(station.id)
                        if (existingChild) {
                            // Redan fördelad: lägg till med befintlig assignee men markera som "existing"
                            initialSelected[station.id] = {
                                station_id: station.id,
                                assigned_to: existingChild.assigned_to || undefined
                            }
                        } else {
                            // Ej fördelad: auto-tilldela om unik stationschef
                            const stationManagerIds = voManagers.filter((m: Manager) =>
                                m.station_ids.includes(station.id)
                            )
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
    }, [open, task.id, task.vo_id, isAreaManager])

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
                body: JSON.stringify({
                    targets,
                    updateAssignees: targets.filter((t: any) => alreadyDistributed.has(t.station_id))
                })
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
        // Returnera alla managers (area_manager visas för alla stationer)
        return managers
    }

    const newCount = Object.keys(selected).filter(id => !alreadyDistributed.has(id)).length
    const updateCount = Object.keys(selected).filter(id => alreadyDistributed.has(id)).length
    const selectedCount = Object.keys(selected).length

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isAreaManager
                            ? <FolderOpen className="h-5 w-5 text-primary" />
                            : <MapPin className="h-5 w-5 text-primary" />
                        }
                        Fördela till stationer
                    </DialogTitle>
                    <DialogDescription>
                        Välj vilka stationer inom ditt {areaLabel} som ska utföra "<strong>{task.title}</strong>"
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
                                        className={`p-3 border rounded-lg transition-colors ${isSelected
                                                ? 'border-primary bg-primary/5'
                                                : 'hover:bg-secondary/50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleStation(station.id)}
                                                    className="w-4 h-4 rounded border-gray-300"
                                                />
                                                <span className="font-medium">{station.name}</span>
                                            </label>
                                            {isDistributed && (
                                                <Badge variant="secondary" className="text-xs">
                                                    Fördelad
                                                </Badge>
                                            )}
                                        </div>

                                        {isSelected && (
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
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            {stations.length === 0 && (
                                <p className="text-center text-muted-foreground py-4">
                                    Inga stationer i detta {areaLabel}
                                </p>
                            )}
                        </div>

                        <DialogFooter>
                            <div className="flex items-center justify-between w-full">
                                <span className="text-sm text-muted-foreground">
                                    {newCount > 0 && `${newCount} nya`}{newCount > 0 && updateCount > 0 && ', '}{updateCount > 0 && `${updateCount} uppdateras`}
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
