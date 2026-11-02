// Medarbetarsamtal - lönesättningens första steg
// /salary-review/employees/[id]/employee-meeting

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import EmployeeMeetingForm from '@/components/salary-review/EmployeeMeetingForm'
import ClosedCycleGuard from '@/components/salary-review/ClosedCycleGuard'
import { getSelectedCycle } from '@/lib/salary-review/cycles-server'
import { getEmployeeMeeting, getOrCreateReview, getPreviousLonesattning } from '@/lib/salary-review/reviews-server'
import PreviousLonesattningPanel from '@/components/salary-review/PreviousLonesattningPanel'
import { hasParticularlySkillfulCriteria } from '@/lib/salary-review/particularly-skilled-criteria'

export default async function EmployeeMeetingPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const { id: employeeId } = await params

    const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, category')
        .eq('id', employeeId)
        .single()

    if (employeeError || !employee) {
        notFound()
    }

    const { cycle } = await getSelectedCycle(supabase)
    if (!cycle) {
        return (
            <div className="container mx-auto py-8">
                <p className="text-muted-foreground">Det finns ingen öppen löneöversyn.</p>
            </div>
        )
    }

    const review = await getOrCreateReview(supabase, cycle, employeeId, user.id)
    if (!review) {
        return (
            <div className="container mx-auto py-8">
                <p className="text-muted-foreground">
                    Medarbetaren har ingen lönesättning i löneöversyn {cycle.year}.
                </p>
            </div>
        )
    }

    const [meeting, previous] = await Promise.all([
        getEmployeeMeeting(supabase, review.id),
        getPreviousLonesattning(supabase, employeeId, cycle.year),
    ])
    const base = `/salary-review/employees/${employeeId}`

    return (
        <ClosedCycleGuard cycle={cycle} backHref={base}>
            <div className="container mx-auto py-8 space-y-6">
                <Link href={base}>
                    <Button variant="ghost">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Tillbaka till medarbetare
                    </Button>
                </Link>

                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Medarbetarsamtal {cycle.year}</h1>
                        <p className="text-muted-foreground">
                            {employee.first_name} {employee.last_name} · Första steget i lönesättningen
                        </p>
                    </div>
                    {/* Länk, inte knapp: ska fungera även i en stängd löneöversyn */}
                    <a
                        href={`/presentation/salary-review/employees/${employeeId}/employee-meeting`}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-accent"
                    >
                        <Monitor className="mr-2 h-4 w-4" />
                        Visa för medarbetaren
                    </a>
                </div>

                <PreviousLonesattningPanel previous={previous} />

                <Card>
                    <CardHeader>
                        <CardTitle>Bedömning</CardTitle>
                        <CardDescription>
                            Bedömningen görs och stäms av i samtalet. Den börjar tom varje år, med fjolårets värde
                            bredvid varje kriterium. Den följer med till lönesamtalet, och när samtalet markeras
                            genomfört sparas den som den var då.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-3">
                        {hasParticularlySkillfulCriteria(employee.category) && (
                            <Link href={`${base}/particularly-skilled`}>
                                <Button variant="outline">
                                    <ClipboardList className="mr-2 h-4 w-4" />
                                    Särskild yrkesskicklighet
                                </Button>
                            </Link>
                        )}
                        <Link href={`${base}/criteria`}>
                            <Button variant="outline">
                                <ClipboardList className="mr-2 h-4 w-4" />
                                Lönekriterier
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Dokumentera samtalet</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <EmployeeMeetingForm reviewId={review.id} initialData={meeting} />
                    </CardContent>
                </Card>
            </div>
        </ClosedCycleGuard>
    )
}
