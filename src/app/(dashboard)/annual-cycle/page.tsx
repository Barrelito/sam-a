
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import AnnualCycleTimeline, { AnnualCycleItemWithStatus, AnnualCycleStationStatus } from '@/components/annual-cycle/AnnualCycleTimeline'
import { ensureAnnualTasksForStations } from '@/lib/annual-cycle-server'

export default async function AnnualCyclePage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
    const supabase = await createClient()

    // 1. Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const now = new Date()
    const currentYear = now.getFullYear()
    const { year: yearParam } = await searchParams
    const parsedYear = parseInt(yearParam || '', 10)
    const year = Number.isFinite(parsedYear) && parsedYear >= 2020 && parsedYear <= 2100
        ? parsedYear
        : currentYear
    // Highlight the current month only when viewing the current year;
    // a past year renders everything as passed, a future year as upcoming
    const currentMonth = year === currentYear ? now.getMonth() + 1 : year < currentYear ? 13 : 0

    // 2. Fetch templates and the viewer's stations
    const [itemsRes, stationsRes] = await Promise.all([
        supabase
            .from('annual_cycle_items')
            .select('*')
            .order('month', { ascending: true }),
        supabase
            .from('user_stations')
            .select('station_id, station:stations(id, name)')
            .eq('user_id', user.id),
    ])

    const items = itemsRes.data || []
    const userStations = (stationsRes.data || [])
        .map(us => {
            const station = Array.isArray(us.station) ? us.station[0] : us.station
            return station ? { id: station.id as string, name: station.name as string } : null
        })
        .filter((s): s is { id: string; name: string } => s !== null)
    const stationIds = userStations.map(s => s.id)

    // 3. Annual cycle tasks are real tasks rows — make sure they exist for the
    //    viewer's stations (no-op for stationless roles and outside the year window)
    await ensureAnnualTasksForStations(supabase, user.id, stationIds, year)

    let tasksQuery = supabase
        .from('tasks')
        .select('id, status, station_id, annual_cycle_item_id, station:station_id(id, name)')
        .eq('year', year)
        .not('annual_cycle_item_id', 'is', null)
    if (stationIds.length > 0) {
        tasksQuery = tasksQuery.in('station_id', stationIds)
    }
    const { data: annualTasks } = await tasksQuery

    // 4. Merge: station managers get one status per (item, own station);
    //    stationless roles (VO chief, admin, area manager) see every station's
    //    task their RLS visibility includes
    const enrichedItems: AnnualCycleItemWithStatus[] = items.map(item => {
        const itemTasks = (annualTasks || []).filter(t => t.annual_cycle_item_id === item.id)

        let stationStatuses: AnnualCycleStationStatus[]
        if (stationIds.length > 0) {
            stationStatuses = userStations.map(target => {
                const task = itemTasks.find(t => t.station_id === target.id)
                return {
                    stationId: target.id,
                    stationName: target.name,
                    status: task?.status ?? 'not_started',
                    href: task ? `/tasks/${task.id}` : null,
                }
            })
        } else {
            stationStatuses = itemTasks.map(t => {
                const station = Array.isArray(t.station) ? t.station[0] : t.station
                return {
                    stationId: t.station_id,
                    stationName: station?.name ?? null,
                    status: t.status,
                    href: `/tasks/${t.id}`,
                }
            })
        }

        return { ...item, station_statuses: stationStatuses }
    })

    return (
        <section id="annual-cycle-root" className="container mx-auto py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Årshjul {year}</h1>
                    <p className="text-muted-foreground mt-1">
                        Din strategiska kalender för året. Här ser du vilka aktiviteter som är planerade för varje månad och hur det går.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="icon" aria-label={`Visa ${year - 1}`}>
                        <Link href={`/annual-cycle?year=${year - 1}`}>
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="icon" aria-label={`Visa ${year + 1}`}>
                        <Link href={`/annual-cycle?year=${year + 1}`}>
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </Button>
                    {year !== currentYear && (
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/annual-cycle">Till {currentYear}</Link>
                        </Button>
                    )}
                    <Button asChild variant="outline">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Tillbaka
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Timeline with live status */}
            <div>
                <AnnualCycleTimeline items={enrichedItems} currentMonth={currentMonth} />
            </div>
        </section>
    )
}
