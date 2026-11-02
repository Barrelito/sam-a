// Medarbetarsamtal - lönesättningens första steg
// /salary-review/employees/[id]/employee-meeting

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import EmployeeMeetingForm from '@/components/salary-review/EmployeeMeetingForm'
import ClosedCycleGuard from '@/components/salary-review/ClosedCycleGuard'
import { getSelectedCycle } from '@/lib/salary-review/cycles-server'
import { getEmployeeMeeting, getOrCreateReview } from '@/lib/salary-review/reviews-server'
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

    const meeting = await getEmployeeMeeting(supabase, review.id)
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

                <div>
                    <h1 className="text-3xl font-bold">Medarbetarsamtal {cycle.year}</h1>
                    <p className="text-muted-foreground">
                        {employee.first_name} {employee.last_name} · Första steget i lönesättningen
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Bedömning</CardTitle>
                        <CardDescription>
                            Bedömningen görs och stäms av i samtalet. Den följer med till lönesamtalet, och när
                            samtalet markeras genomfört sparas den som den var då.
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
