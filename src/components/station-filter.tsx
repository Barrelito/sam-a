"use client"

import { MapPin, FolderOpen } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel,
} from "@/components/ui/select"

interface Station {
    id: string
    name: string
}

interface StationGroup {
    id: string
    name: string
    stations?: { id: string; name?: string }[]
}

interface StationFilterProps {
    stations: Station[]
    stationGroups?: StationGroup[]
    selectedStationId: string | null
    selectedGroupId?: string | null
    onStationChange: (stationId: string | null) => void
    onGroupChange?: (groupId: string | null) => void
    className?: string
}

export function StationFilter({
    stations,
    stationGroups = [],
    selectedStationId,
    selectedGroupId,
    onStationChange,
    onGroupChange,
    className
}: StationFilterProps) {
    // Don't render if user has 0 or 1 station and no groups
    if (stations.length <= 1 && stationGroups.length === 0) {
        return null
    }

    // Determine what's selected
    let displayValue = "Alla stationer"
    let displayIcon = <MapPin className="h-4 w-4 text-primary" />

    if (selectedGroupId) {
        const selectedGroup = stationGroups.find(g => g.id === selectedGroupId)
        if (selectedGroup) {
            displayValue = selectedGroup.name
            displayIcon = <FolderOpen className="h-4 w-4 text-primary" />
        }
    } else if (selectedStationId) {
        const selectedStation = stations.find(s => s.id === selectedStationId)
        if (selectedStation) {
            displayValue = selectedStation.name
        }
    }

    const handleChange = (value: string) => {
        if (value === "all") {
            onStationChange(null)
            onGroupChange?.(null)
        } else if (value.startsWith("group:")) {
            const groupId = value.replace("group:", "")
            onStationChange(null)
            onGroupChange?.(groupId)
        } else {
            onStationChange(value)
            onGroupChange?.(null)
        }
    }

    // Determine current value for the select
    let currentValue = "all"
    if (selectedGroupId) {
        currentValue = `group:${selectedGroupId}`
    } else if (selectedStationId) {
        currentValue = selectedStationId
    }

    const hasGroups = stationGroups.length > 0

    return (
        <div className={className}>
            <Select
                value={currentValue}
                onValueChange={handleChange}
            >
                <SelectTrigger className="w-[220px] bg-background">
                    <div className="flex items-center gap-2">
                        {displayIcon}
                        <span className="truncate">{displayValue}</span>
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Alla stationer
                        </div>
                    </SelectItem>

                    {hasGroups && (
                        <SelectGroup>
                            <SelectLabel className="text-xs text-muted-foreground px-2 py-1.5">
                                Stationsområden
                            </SelectLabel>
                            {stationGroups.map((group) => (
                                <SelectItem key={`group:${group.id}`} value={`group:${group.id}`}>
                                    <div className="flex items-center gap-2">
                                        <FolderOpen className="h-4 w-4" />
                                        <span>{group.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            ({group.stations?.length || 0})
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    )}

                    <SelectGroup>
                        <SelectLabel className="text-xs text-muted-foreground px-2 py-1.5">
                            {hasGroups ? "Enskilda stationer" : "Stationer"}
                        </SelectLabel>
                        {stations.map((station) => (
                            <SelectItem key={station.id} value={station.id}>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    {station.name}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    )
}
