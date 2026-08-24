
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, Clock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface AnnualCycleStationStatus {
    stationId: string | null
    stationName: string | null
    status: 'not_started' | 'in_progress' | 'done' | 'reported'
    href: string
}

export interface AnnualCycleItemWithStatus {
    id: string
    title: string
    description: string | null
    month: number
    category: string
    action_link?: string | null
    // One entry per station the viewer manages (or a single entry without
    // station for VO chiefs/admins). Empty/undefined = render without status.
    station_statuses?: AnnualCycleStationStatus[]
}

const MONTHS = [
    'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
    'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
]

const isDone = (status: AnnualCycleStationStatus['status']) => status === 'done' || status === 'reported'

function itemIsDone(item: AnnualCycleItemWithStatus): boolean {
    const statuses = item.station_statuses || []
    return statuses.length > 0 && statuses.every(s => isDone(s.status))
}

function ItemStatusIcon({ item }: { item: AnnualCycleItemWithStatus }) {
    const statuses = item.station_statuses || []
    if (statuses.length === 0) return null

    if (itemIsDone(item)) {
        return <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
    }
    if (statuses.some(s => isDone(s.status) || s.status === 'in_progress')) {
        return <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
    }
    return <Circle className="h-4 w-4 text-gray-300 flex-shrink-0 mt-0.5" />
}

function StationChip({ status }: { status: AnnualCycleStationStatus }) {
    const color = isDone(status.status)
        ? 'border-green-200 bg-green-50 text-green-700'
        : status.status === 'in_progress'
            ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
            : 'border-gray-200 bg-gray-50 text-gray-500'
    return (
        <Link
            href={status.href}
            className={cn(
                'inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border transition-colors hover:shadow-sm',
                color
            )}
        >
            {isDone(status.status)
                ? <CheckCircle2 className="h-3 w-3" />
                : status.status === 'in_progress'
                    ? <Clock className="h-3 w-3" />
                    : <Circle className="h-3 w-3" />}
            {status.stationName || 'Uppgift'}
        </Link>
    )
}

function ItemRow({ item }: { item: AnnualCycleItemWithStatus }) {
    const statuses = item.station_statuses || []
    const done = itemIsDone(item)

    const content = (
        <div className="flex items-start gap-2">
            <ItemStatusIcon item={item} />
            <div className="flex flex-col gap-1 min-w-0">
                <h4 className={cn(
                    'text-sm font-semibold transition-colors',
                    done ? 'text-gray-400' : 'text-gray-900 group-hover:text-blue-700'
                )}>
                    {item.title}
                </h4>
                {item.description && (
                    <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                        {item.description}
                    </p>
                )}
                {statuses.length > 1 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {statuses.map(s => (
                            <StationChip key={s.stationId || 'personal'} status={s} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )

    const rowClass = 'group flex flex-col gap-1 p-2 rounded-md hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all'

    // Single target: the whole row links to its (virtual or real) task.
    // Multiple stations: the per-station chips carry the links instead.
    if (statuses.length === 1) {
        return (
            <Link href={statuses[0].href} className={rowClass}>
                {content}
            </Link>
        )
    }
    return <div className={rowClass}>{content}</div>
}

export default function AnnualCycleTimeline({ items, currentMonth }: { items: AnnualCycleItemWithStatus[], currentMonth: number }) {
    // Group items by month
    const itemsByMonth = items.reduce((acc, item) => {
        if (!acc[item.month]) acc[item.month] = []
        acc[item.month].push(item)
        return acc
    }, {} as Record<number, AnnualCycleItemWithStatus[]>)

    const hasStatuses = items.some(i => (i.station_statuses || []).length > 0)

    return (
        <div className="space-y-6">
            {hasStatuses && (
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Klar
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-yellow-600" /> Pågående
                    </span>
                    <span className="flex items-center gap-1">
                        <Circle className="h-3.5 w-3.5 text-gray-300" /> Ej påbörjad
                    </span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {MONTHS.map((monthName, index) => {
                    const monthNum = index + 1
                    const monthItems = itemsByMonth[monthNum] || []
                    const isCurrentMonth = monthNum === currentMonth
                    const isPast = monthNum < currentMonth

                    const doneItems = monthItems.filter(itemIsDone).length
                    const allDone = monthItems.length > 0 && doneItems === monthItems.length

                    return (
                        <Card
                            key={monthNum}
                            className={cn(
                                "relative overflow-hidden transition-all hover:shadow-md h-full",
                                isCurrentMonth ? "border-blue-500 ring-1 ring-blue-500 shadow-md bg-blue-50/20" : "opacity-90",
                                isPast && "bg-gray-50/50"
                            )}
                        >
                            {isCurrentMonth && (
                                <div className="absolute top-0 right-0 px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-bl">
                                    NU
                                </div>
                            )}

                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between gap-2">
                                    <CardTitle className={cn("text-lg", isCurrentMonth ? "text-blue-700" : "text-gray-700")}>
                                        {monthName}
                                    </CardTitle>
                                    {hasStatuses && monthItems.length > 0 && (
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                'text-xs',
                                                allDone
                                                    ? 'border-green-200 bg-green-50 text-green-700'
                                                    : 'text-muted-foreground'
                                            )}
                                        >
                                            {doneItems}/{monthItems.length} klara
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {monthItems.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">Inga aktiviteter</p>
                                ) : (
                                    monthItems.map(item => <ItemRow key={item.id} item={item} />)
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
