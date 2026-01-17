
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface AnnualCycleItem {
    id: string
    title: string
    description: string
    month: number
    category: 'hr' | 'finance' | 'environment' | 'other'
    action_link?: string
    is_completed?: boolean // Legacy
    status?: 'not_started' | 'in_progress' | 'done' | 'completed'
    task_id?: string | null
}

const MONTHS = [
    'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
    'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
]

export default function AnnualCycleTimeline({ items, currentMonth }: { items: AnnualCycleItem[], currentMonth: number }) {
    // Group items by month
    const itemsByMonth = items.reduce((acc, item) => {
        if (!acc[item.month]) acc[item.month] = []
        acc[item.month].push(item)
        return acc
    }, {} as Record<number, AnnualCycleItem[]>)

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {MONTHS.map((monthName, index) => {
                    const monthNum = index + 1
                    const monthItems = itemsByMonth[monthNum] || []
                    const isCurrentMonth = monthNum === currentMonth
                    const isPast = monthNum < currentMonth

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
                                <CardTitle className={cn("text-lg", isCurrentMonth ? "text-blue-700" : "text-gray-700")}>
                                    {monthName}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {monthItems.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">Inga aktiviteter</p>
                                ) : (
                                    monthItems.map(item => (
                                        <div
                                            key={item.id}
                                            className="group flex flex-col gap-1 p-2 rounded-md hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all"
                                        >
                                            <div className="flex flex-col gap-1">
                                                <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                                                    {item.title}
                                                </h4>
                                                <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
