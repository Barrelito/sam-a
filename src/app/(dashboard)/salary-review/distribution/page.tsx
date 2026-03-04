// Salary Distribution Page
// Stationschefens vy för lönefördelning

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import SalaryDistribution from '@/components/salary-review/SalaryDistribution'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import DistributionSelector from '@/components/salary-review/DistributionSelector'

export default async function DistributionPage({
    searchParams
}: {
    searchParams: Promise<{ station_id?: string; station_group_id?: string }>
}) {
    const supabase = await createClient()
    const params = await searchParams

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check user role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['station_manager', 'assistant_manager', 'area_manager', 'vo_chief', 'admin'].includes(profile.role)) {
        return (
            <div className="container mx-auto py-8">
                <h1 className="text-2xl font-bold text-red-600">Åtkomst nekad</h1>
                <p className="text-muted-foreground mt-2">
                    Du har inte behörighet att hantera lönefördelning.
                </p>
            </div>
        )
    }

    // Hämta stationer: area_manager via user_station_groups, annars via user_stations
    let userStationsResult: Array<{ station_id: string; station: any }> = []

    if (profile.role === 'area_manager') {
        const { data: groupData } = await supabase
            .from('user_station_groups')
            .select(`
                station_group:station_group_id (
                    station_group_members (
                        station:station_id (id, name)
                    )
                )
            `)
            .eq('user_id', user.id)

        userStationsResult = groupData?.flatMap((usg: any) =>
            usg.station_group?.station_group_members?.map((m: any) => ({
                station_id: m.station?.id,
                station: m.station
            })).filter((x: any) => x.station_id) || []
        ) || []
    } else {
        const { data: userStations } = await supabase
            .from('user_stations')
            .select('station_id, station:stations(id, name)')
            .eq('user_id', user.id)
        userStationsResult = userStations || []
    }

    const userStations = userStationsResult

    const userStationIds = userStations.map(us => us.station_id)

    // Get station groups
    const { data: stationGroups } = await supabase
        .from('station_groups')
        .select(`id, name, station_group_members!inner(station_id)`)
        .in('station_group_members.station_id', userStationIds)

    // Determine what to display
    let displayMode: 'station' | 'group' = 'station'
    let selectedStationId: string | null = null
    let selectedStationName: string | null = null
    let selectedGroupId: string | null = null
    let selectedGroupName: string | null = null

    if (params.station_group_id && stationGroups) {
        // Station group mode
        const group = stationGroups.find(g => g.id === params.station_group_id)
        if (group) {
            displayMode = 'group'
            selectedGroupId = group.id
            selectedGroupName = group.name
        }
    }

    if (!selectedGroupId && params.station_id) {
        // Individual station mode from URL
        const station = userStations.find(us => us.station_id === params.station_id)
        if (station && station.station) {
            // @ts-ignore
            selectedStationId = station.station.id
            // @ts-ignore
            selectedStationName = station.station.name
        }
    }

    // Default to first station if nothing selected
    if (!selectedStationId && !selectedGroupId && userStations[0]?.station) {
        selectedStationId = userStations[0].station_id
        // @ts-ignore
        selectedStationName = userStations[0].station.name
    }

    // Get active cycle
    const { data: activeCycle } = await supabase
        .from('salary_review_cycles')
        .select('id, year')
        .eq('status', 'active')
        .single()

    if (!activeCycle) {
        return (
            <div className="container mx-auto py-8">
                <h1 className="text-2xl font-bold">Ingen aktiv cykel</h1>
                <p className="text-muted-foreground mt-2">
                    Det finns ingen aktiv löneöversynscykel.
                </p>
            </div>
        )
    }

    // Prepare options for selector
    const stations = userStations.map(us => ({
        // @ts-ignore
        id: us.station?.id || us.station_id,
        // @ts-ignore
        name: us.station?.name || 'Unknown Station'
    }))

    const groups = (stationGroups || []).map(g => ({
        id: g.id,
        name: g.name
    }))

    return (
        <div className="container mx-auto py-8">
            <Link href="/salary-review/employees">
                <Button variant="ghost" className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tillbaka till medarbetare
                </Button>
            </Link>

            <DistributionSelector
                stations={stations}
                stationGroups={groups}
                selectedStationId={selectedStationId}
                selectedGroupId={selectedGroupId}
            />

            <div className="mt-6">
                <SalaryDistribution
                    stationId={selectedStationId || undefined}
                    stationName={selectedStationName || undefined}
                    stationGroupId={selectedGroupId || undefined}
                    stationGroupName={selectedGroupName || undefined}
                    cycleId={activeCycle.id}
                />
            </div>
        </div>
    )
}
