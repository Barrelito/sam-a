
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, CheckCircle2, Circle, ArrowLeft, ArrowUpRight } from 'lucide-react'
import AnnualCycleTimeline from '@/components/annual-cycle/AnnualCycleTimeline'

export default async function AnnualCyclePage() {
    const supabase = await createClient()

    // 1. Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1

    // Fetch Items ONLY (No status check needed for static view)
    const { data: items } = await supabase
        .from('annual_cycle_items')
        .select('*')
        .order('month', { ascending: true })

    const staticItems = items || []

    return (
        <section id="annual-cycle-root" className="container mx-auto py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight" suppressHydrationWarning>Årshjul {currentYear}</h1>
                    <p className="text-muted-foreground mt-1">
                        Din strategiska kalender för året. Här ser du vilka aktiviteter som är planerade för varje månad.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="outline">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Tillbaka
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Full Timeline (Static) */}
            <div>
                <AnnualCycleTimeline items={staticItems} currentMonth={currentMonth} />
            </div>
        </section>
    )
}
