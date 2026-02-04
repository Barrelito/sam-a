'use client'

import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Users } from 'lucide-react'

interface Station {
    id: string
    name: string
}

interface StationGroup {
    id: string
    name: string
}

interface DistributionSelectorProps {
    stations: Station[]
    stationGroups: StationGroup[]
    selectedStationId: string | null
    selectedGroupId: string | null
}

export default function DistributionSelector({
    stations,
    stationGroups,
    selectedStationId,
    selectedGroupId
}: DistributionSelectorProps) {
    const router = useRouter()

    const handleChange = (value: string) => {
        if (value.startsWith('station_')) {
            const stationId = value.replace('station_', '')
            router.push(`/salary-review/distribution?station_id=${stationId}`)
        } else if (value.startsWith('group_')) {
            const groupId = value.replace('group_', '')
            router.push(`/salary-review/distribution?station_group_id=${groupId}`)
        }
    }

    const currentValue = selectedGroupId
        ? `group_${selectedGroupId}`
        : selectedStationId
            ? `station_${selectedStationId}`
            : undefined

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-medium whitespace-nowrap">
                        Visa lönefördelning för:
                    </label>
                    <Select value={currentValue} onValueChange={handleChange}>
                        <SelectTrigger className="w-full max-w-md">
                            <SelectValue placeholder="Välj station eller stationsområde" />
                        </SelectTrigger>
                        <SelectContent>
                            {stationGroups.length > 0 && (
                                <>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                        Stationsområden
                                    </div>
                                    {stationGroups.map(group => (
                                        <SelectItem key={`group_${group.id}`} value={`group_${group.id}`}>
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4" />
                                                {group.name} (Stationsområde)
                                            </div>
                                        </SelectItem>
                                    ))}
                                </>
                            )}
                            {stations.length > 0 && (
                                <>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                        Enskilda stationer
                                    </div>
                                    {stations.map(station => (
                                        <SelectItem key={`station_${station.id}`} value={`station_${station.id}`}>
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4" />
                                                {station.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
    )
}
