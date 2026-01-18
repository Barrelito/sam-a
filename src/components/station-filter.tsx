"use client"

import { MapPin } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Station {
    id: string
    name: string
}

interface StationFilterProps {
    stations: Station[]
    selectedStationId: string | null
    onStationChange: (stationId: string | null) => void
    className?: string
}

export function StationFilter({
    stations,
    selectedStationId,
    onStationChange,
    className
}: StationFilterProps) {
    // Don't render if user has 0 or 1 station
    if (stations.length <= 1) {
        return null
    }

    const selectedStation = stations.find(s => s.id === selectedStationId)
    const displayValue = selectedStation?.name || "Alla stationer"

    const handleChange = (value: string) => {
        if (value === "all") {
            onStationChange(null)
        } else {
            onStationChange(value)
        }
    }

    return (
        <div className={className}>
            <Select
                value={selectedStationId || "all"}
                onValueChange={handleChange}
            >
                <SelectTrigger className="w-[200px] bg-background">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>{displayValue}</span>
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">
                        Alla stationer
                    </SelectItem>
                    {stations.map((station) => (
                        <SelectItem key={station.id} value={station.id}>
                            {station.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
