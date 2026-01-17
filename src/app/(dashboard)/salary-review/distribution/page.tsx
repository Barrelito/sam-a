// Salary Distribution Page
// Stationschefens vy för lönefördelning

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import SalaryDistribution from '@/components/salary-review/SalaryDistribution'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function DistributionPage({
    searchParams
}: {
    searchParams: Promise<{ station_id?: string }>
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

    if (!profile || !['station_manager', 'assistant_manager', 'admin'].includes(profile.role)) {
        return (
            <div className="container mx-auto py-8">
                <h1 className="text-2xl font-bold text-red-600">Åtkomst nekad</h1>
                <p className="text-muted-foreground mt-2">
                    Du har inte behörighet att hantera lönefördelning.
                </p>
            </div>
        )
    }

    // Get station_id from query params or user's stations
    let stationId = params.station_id

    if (!stationId) {
        // Get user's first station
        const { data: userStation } = await supabase
            .from('user_stations')
            .select('station_id')
            .eq('user_id', user.id)
            .limit(1)
            .single()

        if (!userStation) {
            notFound()
        }
        stationId = userStation.station_id
    }

    // Get station info
    const { data: station } = await supabase
        .from('stations')
        .select('id, name')
        .eq('id', stationId)
        .single()

    if (!station) {
        notFound()
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

    return (
        <div className="container mx-auto py-8">
            <Link href="/salary-review/employees">
                <Button variant="ghost" className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tillbaka till medarbetare
                </Button>
            </Link>

            <SalaryDistribution
                stationId={station.id}
                stationName={station.name}
                cycleId={activeCycle.id}
            />
        </div>
    )
}
