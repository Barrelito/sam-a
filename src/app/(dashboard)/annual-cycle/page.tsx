
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import AnnualCycleTimeline, { AnnualCycleItemWithStatus, AnnualCycleStationStatus } from '@/components/annual-cycle/AnnualCycleTimeline'
import { buildVirtualAnnualId, fromCompletionStatus } from '@/lib/annual-cycle'

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

    // 3. Fetch status sources for the selected year:
    //    completions (list-view status) and materialized tasks (detail-view status).
    //    A materialized task takes precedence, mirroring the dedup in GET /api/tasks.
    let completionsQuery = supabase
        .from('annual_task_completions')
        .select('annual_cycle_item_id, station_id, user_id, status')
        .eq('year', year)
    completionsQuery = stationIds.length > 0
        ? completionsQuery.or(`station_id.in.(${stationIds.join(',')}),user_id.eq.${user.id}`)
        : completionsQuery.eq('user_id', user.id)

    let tasksQuery = supabase
        .from('tasks')
        .select('id, status, station_id, annual_cycle_item_id')
        .eq('year', year)
        .not('annual_cycle_item_id', 'is', null)
    tasksQuery = stationIds.length > 0
        ? tasksQuery.in('station_id', stationIds)
        : tasksQuery.is('station_id', null)

    const [{ data: completions }, { data: realTasks }] = await Promise.all([
        completionsQuery,
        tasksQuery,
    ])

    // 4. Merge: one status per (item, station) — or per item for viewers without stations
    const targets: Array<{ id: string; name: string } | null> =
        userStations.length > 0 ? userStations : [null]

    const enrichedItems: AnnualCycleItemWithStatus[] = items.map(item => {
        const stationStatuses: AnnualCycleStationStatus[] = targets.map(target => {
            const realTask = realTasks?.find(t =>
                t.annual_cycle_item_id === item.id &&
                (target ? t.station_id === target.id : t.station_id === null)
            )
            if (realTask) {
                return {
                    stationId: target?.id ?? null,
                    stationName: target?.name ?? null,
                    status: realTask.status,
                    href: `/tasks/${realTask.id}`,
                }
            }

            const completion = completions?.find(c =>
                c.annual_cycle_item_id === item.id &&
                (target ? c.station_id === target.id : c.user_id === user.id)
            )
            return {
                stationId: target?.id ?? null,
                stationName: target?.name ?? null,
                status: fromCompletionStatus(completion?.status),
                href: `/tasks/${buildVirtualAnnualId(item.id, target?.id)}`,
            }
        })

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
